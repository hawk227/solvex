'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { placeOrder } from '@solvex/db';
import { db } from '@/lib/cf';
import { requireCustomer } from '@/lib/session';
import { audit } from '@/lib/audit';

export type BookingResult = { ok: true; code: string } | { ok: false; error: string };

/**
 * The form supplies only choices. Price, credit and capacity are all recomputed
 * server-side by `placeOrder`, so a tampered payload cannot set a price, spend
 * credit it does not have, or exceed a slot's capacity.
 */
const BookingInput = z.object({
  serviceId: z.coerce.number().int().positive(),
  optionIds: z
    .string()
    .optional()
    .transform((v) =>
      (v ?? '')
        .split(',')
        .map((s) => Number.parseInt(s.trim(), 10))
        .filter((n) => Number.isInteger(n) && n > 0),
    ),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date.'),
  slotId: z.coerce.number().int().positive('Choose a time window.'),
  useCredit: z.coerce.number().int().min(0).max(10_000_000).default(0),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
});

const MESSAGES: Record<string, string> = {
  'no-profile': 'Complete your profile before booking.',
  'service-unavailable': 'That service is no longer available.',
  'slot-unavailable': 'That time window is no longer available.',
  'area-unavailable': 'We are not currently booking in your area.',
  'not-priced': 'That combination is not priced. Please contact us for a quote.',
  'slot-full': 'That window just filled up. Please pick another.',
};

export async function submitBooking(formData: FormData): Promise<BookingResult> {
  const customer = await requireCustomer();

  const parsed = BookingInput.safeParse({
    serviceId: formData.get('serviceId'),
    optionIds: formData.get('optionIds'),
    scheduledDate: formData.get('scheduledDate'),
    slotId: formData.get('slotId'),
    useCredit: formData.get('useCredit') || 0,
    notes: formData.get('notes'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the form.' };
  }

  const { serviceId, optionIds, scheduledDate, slotId, useCredit, notes } = parsed.data;

  // A booking in the past is never valid, whatever the client sent.
  const today = new Date().toISOString().slice(0, 10);
  if (scheduledDate < today) {
    return { ok: false, error: 'Choose a date from today onwards.' };
  }

  const result = await placeOrder(db(), {
    userId: customer.id,
    serviceId,
    optionIds,
    scheduledDate,
    slotId,
    requestedCredit: useCredit,
    notes: notes || null,
  });

  if (!result.ok) {
    await audit({
      action: 'orders.place',
      targetType: 'service',
      targetId: serviceId,
      outcome: 'ERROR',
      reason: result.reason,
      detail: { scheduledDate, slotId, requestedCredit: useCredit },
    });
    return { ok: false, error: MESSAGES[result.reason] ?? 'We could not place that booking.' };
  }

  await audit({
    action: 'orders.place',
    targetType: 'order',
    targetId: result.orderId,
    targetLabel: result.code,
    detail: { serviceId, optionIds, scheduledDate, slotId, creditApplied: useCredit },
  });

  revalidatePath('/orders');
  return { ok: true, code: result.code };
}
