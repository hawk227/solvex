'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { ORDER_STATUSES, payReferralReward, schema } from '@solvex/db';
import { db } from '@/lib/cf';
import { requireManage } from '@/lib/session';
import { optionalText } from '@/lib/form';
import { ALLOWED_NEXT } from './transitions';

export type ActionResult = { ok: true } | { ok: false; error: string };

const Input = z.object({
  orderId: z.coerce.number().int().positive(),
  next: z.enum(ORDER_STATUSES),
  note: optionalText(300),
});

/**
 * Move an order to its next status.
 *
 * Permitted transitions are re-checked here, not merely narrowed in the UI: an
 * order must not be able to jump from PENDING straight to COMPLETED, or move on
 * once it is finished, however the request was constructed.
 */
export async function updateOrderStatus(formData: FormData): Promise<ActionResult> {
  const admin = await requireManage('orders');

  const parsed = Input.safeParse({
    orderId: formData.get('orderId'),
    next: formData.get('next'),
    note: formData.get('note'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const { orderId, next, note } = parsed.data;
  const d = db();

  const [order] = await d
    .select({
      id: schema.orders.id,
      status: schema.orders.status,
      userId: schema.orders.userId,
      creditApplied: schema.orders.creditApplied,
    })
    .from(schema.orders)
    .where(eq(schema.orders.id, orderId))
    .limit(1);

  if (!order) return { ok: false, error: 'Order not found.' };

  if (!ALLOWED_NEXT[order.status].includes(next)) {
    return { ok: false, error: `An order that is ${order.status} cannot move to ${next}.` };
  }

  // Conditional on the status just read, so two admins acting at the same moment
  // cannot both apply a transition from the same starting state.
  const updated = await d
    .update(schema.orders)
    .set({ status: next })
    .where(and(eq(schema.orders.id, orderId), inArray(schema.orders.status, [order.status])))
    .returning({ id: schema.orders.id });

  if (updated.length === 0) {
    return { ok: false, error: 'Someone else just changed this order. Refresh and try again.' };
  }

  // Cancelling returns any credit the customer spent on this order, as a new
  // ledger row rather than by editing the original debit.
  if (next === 'CANCELLED' && order.creditApplied > 0) {
    await d.insert(schema.creditLedger).values({
      userId: order.userId,
      delta: order.creditApplied,
      reason: 'ADMIN_ADJUSTMENT',
      orderId: order.id,
    });
  }

  await d.insert(schema.orderEvents).values({
    orderId,
    status: next,
    note: note || null,
    adminId: admin.id,
  });

  // Completing the work is what earns a referral reward. payReferralReward is
  // idempotent and enforces "first completed order only" against the database,
  // so calling it here cannot pay twice.
  if (next === 'COMPLETED') {
    const payout = await payReferralReward(d, orderId);
    if (payout.paid) {
      await d.insert(schema.orderEvents).values({
        orderId,
        status: 'COMPLETED',
        note: `Referral reward of ৳${payout.amount} credited to the referrer`,
        adminId: admin.id,
      });
    }
  }

  revalidatePath('/admin/orders');
  revalidatePath('/admin/referrals');
  revalidatePath('/admin/dashboard');
  return { ok: true };
}
