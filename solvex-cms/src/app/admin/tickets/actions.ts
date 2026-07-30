'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { TICKET_STATUSES, replyAsStaff, setTicketStatus } from '@solvex/db';
import { db } from '@/lib/cf';
import { requireManage } from '@/lib/session';
import { audit } from '@/lib/audit';

export type ActionResult = { ok: true } | { ok: false; error: string };

const Reply = z.object({
  body: z.string().trim().min(1, 'Write a message first.').max(4000),
  internal: z.boolean(),
});

export async function postReply(ticketId: number, formData: FormData): Promise<ActionResult> {
  const employee = await requireManage('tickets');

  const parsed = Reply.safeParse({
    body: formData.get('body'),
    // The checkbox is absent when unticked, so anything other than 'on' is a
    // public reply. Defaulting the other way would publish internal notes.
    internal: formData.get('internal') === 'on',
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Write a message first.' };
  }

  const result = await replyAsStaff(
    db(),
    ticketId,
    employee.id,
    employee.name,
    parsed.data.body,
    parsed.data.internal,
  );

  if (!result.ok) return { ok: false, error: 'That ticket no longer exists.' };

  // Whether the reply was internal matters more than its text, so that is what
  // is recorded; the message body already lives in the ticket thread.
  await audit({
    action: parsed.data.internal ? 'tickets.note.add' : 'tickets.reply',
    module: 'tickets',
    targetType: 'ticket',
    targetId: ticketId,
    detail: { internal: parsed.data.internal, length: parsed.data.body.length },
  });

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath('/admin/tickets');
  return { ok: true };
}

export async function changeStatus(ticketId: number, status: string): Promise<ActionResult> {
  const employee = await requireManage('tickets');

  const parsed = z.enum(TICKET_STATUSES).safeParse(status);
  if (!parsed.success) return { ok: false, error: 'Unknown status.' };

  const result = await setTicketStatus(db(), ticketId, parsed.data, employee.id, employee.name);
  if (!result.ok) return { ok: false, error: 'That ticket no longer exists.' };

  await audit({
    action: 'tickets.status.change',
    module: 'tickets',
    targetType: 'ticket',
    targetId: ticketId,
    detail: { to: parsed.data },
  });

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath('/admin/tickets');
  return { ok: true };
}
