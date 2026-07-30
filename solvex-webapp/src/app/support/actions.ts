'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { TICKET_TOPICS, openTicket, replyAsCustomer, schema } from '@solvex/db';
import { db } from '@/lib/cf';
import { getProfile, requireCustomer } from '@/lib/session';
import { audit } from '@/lib/audit';

export type TicketResult = { ok: true; ref?: string } | { ok: false; error: string };

const NewTicket = z.object({
  subject: z.string().trim().min(5, 'Give your issue a short title.').max(120),
  topic: z.enum(TICKET_TOPICS),
  body: z.string().trim().min(10, 'Please describe the problem in a little more detail.').max(4000),
  orderCode: z.string().trim().optional().or(z.literal('')),
});

export async function createTicket(formData: FormData): Promise<TicketResult> {
  const customer = await requireCustomer();

  const parsed = NewTicket.safeParse({
    subject: formData.get('subject'),
    topic: formData.get('topic'),
    body: formData.get('body'),
    orderCode: formData.get('orderCode'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the form.' };
  }

  const { subject, topic, body, orderCode } = parsed.data;

  /*
   * The form offers an order CODE, not an id, and it is resolved here scoped to
   * the caller. openTicket re-checks ownership anyway — this is belt and braces,
   * because attaching someone else's booking would expose their address and
   * phone in the staff view.
   */
  let orderId: number | null = null;
  if (orderCode) {
    const [order] = await db()
      .select({ id: schema.orders.id })
      .from(schema.orders)
      .where(eq(schema.orders.code, orderCode))
      .limit(1);
    orderId = order?.id ?? null;
  }

  const profile = await getProfile(customer.id);

  const result = await openTicket(db(), {
    userId: customer.id,
    subject,
    topic,
    body,
    orderId,
    authorName: profile?.fullName ?? customer.name,
  });

  if (!result.ok) {
    // Someone attaching an order that is not theirs is worth a row.
    await audit({
      action: 'tickets.open',
      targetType: 'order',
      targetLabel: orderCode || null,
      outcome: 'DENIED',
      reason: result.reason,
    });
    return { ok: false, error: 'That booking is not on your account.' };
  }

  await audit({
    action: 'tickets.open',
    targetType: 'ticket',
    targetId: result.id,
    targetLabel: result.ref,
    detail: { topic, orderCode: orderCode || null },
  });

  revalidatePath('/support');
  return { ok: true, ref: result.ref };
}

const Reply = z.object({
  body: z.string().trim().min(1, 'Write a message first.').max(4000),
});

export async function replyToTicket(ref: string, formData: FormData): Promise<TicketResult> {
  const customer = await requireCustomer();

  const parsed = Reply.safeParse({ body: formData.get('body') });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Write a message first.' };
  }

  const profile = await getProfile(customer.id);

  const result = await replyAsCustomer(
    db(),
    customer.id,
    ref,
    parsed.data.body,
    profile?.fullName ?? customer.name,
  );

  if (!result.ok) {
    return {
      ok: false,
      error:
        result.reason === 'closed'
          ? 'This ticket is closed. Please open a new one.'
          : 'That ticket could not be found.',
    };
  }

  await audit({
    action: 'tickets.reply',
    targetType: 'ticket',
    targetLabel: ref,
    detail: { length: parsed.data.body.length },
  });

  revalidatePath(`/support/${ref}`);
  revalidatePath('/support');
  return { ok: true };
}
