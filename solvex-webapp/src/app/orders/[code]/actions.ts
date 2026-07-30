'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, inArray } from 'drizzle-orm';
import { schema } from '@solvex/db';
import { db } from '@/lib/cf';
import { requireCustomer } from '@/lib/session';

export type CancelResult = { ok: true } | { ok: false; error: string };

/**
 * Customer-initiated cancellation.
 *
 * Only allowed before the technician is on the way, and only on the caller's own
 * order — the userId is part of the WHERE clause, so a guessed code cannot
 * cancel someone else's booking.
 *
 * Any credit spent on the order is returned as a compensating ledger row rather
 * than by editing the original debit, so the customer's statement shows both the
 * spend and the refund.
 */
export async function cancelOrder(code: string): Promise<CancelResult> {
  const customer = await requireCustomer();
  const d = db();

  const [order] = await d
    .select({
      id: schema.orders.id,
      status: schema.orders.status,
      creditApplied: schema.orders.creditApplied,
    })
    .from(schema.orders)
    .where(and(eq(schema.orders.code, code), eq(schema.orders.userId, customer.id)))
    .limit(1);

  if (!order) return { ok: false, error: 'Booking not found.' };
  if (order.status === 'CANCELLED') return { ok: false, error: 'This booking is already cancelled.' };
  if (order.status === 'COMPLETED') {
    return { ok: false, error: 'Completed work cannot be cancelled.' };
  }
  if (!['PENDING', 'APPROVED'].includes(order.status)) {
    return {
      ok: false,
      error: 'The technician is already on the way. Please call us to cancel.',
    };
  }

  // Conditional update: only cancels if the status is still one of the
  // cancellable ones, so an admin moving the order forward at the same moment
  // wins rather than both writes landing.
  const updated = await d
    .update(schema.orders)
    .set({ status: 'CANCELLED' })
    .where(
      and(
        eq(schema.orders.id, order.id),
        inArray(schema.orders.status, ['PENDING', 'APPROVED']),
      ),
    )
    .returning({ id: schema.orders.id });

  if (updated.length === 0) {
    return { ok: false, error: 'This booking has just moved on. Please refresh and call us.' };
  }

  if (order.creditApplied > 0) {
    await d.insert(schema.creditLedger).values({
      userId: customer.id,
      delta: order.creditApplied,
      reason: 'ADMIN_ADJUSTMENT',
      orderId: order.id,
    });
  }

  await d.insert(schema.orderEvents).values({
    orderId: order.id,
    status: 'CANCELLED',
    note: 'Cancelled by customer',
  });

  revalidatePath('/orders');
  revalidatePath(`/orders/${code}`);
  return { ok: true };
}
