'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { schema, isUniqueViolation, findProfileByPhone, synthesizeWalkInEmail, placeOrder } from '@solvex/db';
import { db } from '@/lib/cf';
import { requireManage } from '@/lib/session';
import { audit } from '@/lib/audit';

export type CreateCustomerResult = { ok: true; userId: string } | { ok: false; error: string };
export type CreateOrderResult = { ok: true; code: string } | { ok: false; error: string };

/** Unambiguous alphabet: no O/0, I/1, so a code can be read out over the phone. */
const REFERRAL_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateReferralCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => REFERRAL_ALPHABET[b % REFERRAL_ALPHABET.length]).join('');
}

const WalkInCustomerInput = z.object({
  fullName: z.string().trim().min(2, 'Enter a full name.').max(80),
  // The phone comes from this form's own hidden field, already normalized by
  // the page that rendered it — validated again here since a server action is
  // its own POST endpoint, reachable however the request was constructed.
  phone: z.string().min(1, 'Missing phone number.'),
  address: z.string().trim().min(10, 'Give enough detail for a technician to find them.').max(300),
  areaId: z.coerce.number().int().positive('Choose an area.'),
  locationId: z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v && v !== '' ? Number(v) : null)),
});

/**
 * Find an existing customer by phone, or create a minimal "walk-in" one.
 *
 * A walk-in user row has a synthetic email (see @solvex/db's walkin.ts) and no
 * `account`/`session` row, so it cannot sign in — staff manage its orders from
 * here. If the same phone later completes a real signup on the website, that
 * signup's `saveProfile` action folds this history into the real account (see
 * Task 6 / docs/superpowers/specs/2026-08-08-cms-order-creation-design.md).
 */
export async function createWalkInCustomer(formData: FormData): Promise<CreateCustomerResult> {
  await requireManage('customers');

  const parsed = WalkInCustomerInput.safeParse({
    fullName: formData.get('fullName'),
    phone: formData.get('phone'),
    address: formData.get('address'),
    areaId: formData.get('areaId'),
    locationId: formData.get('locationId'),
  });
  if (!parsed.success) {
    const error = parsed.error.issues[0]?.message ?? 'Please check the form.';
    await audit({
      action: 'customer.create-walkin',
      module: 'customers',
      outcome: 'DENIED',
      reason: error,
      detail: { phone: formData.get('phone') },
    });
    return { ok: false, error };
  }

  const { fullName, phone, address, areaId, locationId } = parsed.data;
  const d = db();

  // A repeat caller: reuse their existing customer (walk-in or real) rather
  // than creating a second one.
  const existing = await findProfileByPhone(d, phone);
  if (existing) {
    return { ok: true, userId: existing.userId };
  }

  const [area] = await d
    .select({ id: schema.areas.id })
    .from(schema.areas)
    .where(and(eq(schema.areas.id, areaId), eq(schema.areas.active, true)))
    .limit(1);
  if (!area) {
    await audit({
      action: 'customer.create-walkin',
      module: 'customers',
      outcome: 'DENIED',
      reason: 'area not available',
      detail: { phone, areaId },
    });
    return { ok: false, error: 'That area is no longer available. Pick another.' };
  }

  const userId = crypto.randomUUID();
  const email = synthesizeWalkInEmail(phone);

  try {
    await d.insert(schema.user).values({ id: userId, name: fullName, email, emailVerified: false });
  } catch (err) {
    if (isUniqueViolation(err, 'user.email')) {
      await audit({
        action: 'customer.create-walkin',
        module: 'customers',
        outcome: 'ERROR',
        reason: 'duplicate phone (walk-in email collision)',
        detail: { phone },
      });
      return { ok: false, error: 'A customer with this phone already exists. Refresh and search again.' };
    }
    throw err;
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const referralCode = generateReferralCode();
    try {
      await d.insert(schema.profiles).values({ userId, fullName, phone, address, areaId, locationId, referralCode });
      break;
    } catch (err) {
      if (isUniqueViolation(err, 'profiles.referral_code') && attempt < 4) continue;
      throw err;
    }
  }

  await audit({
    action: 'customer.create-walkin',
    module: 'customers',
    targetType: 'profile',
    targetId: userId,
    targetLabel: fullName,
    detail: { phone, areaId, locationId },
  });

  revalidatePath('/admin/customers');
  return { ok: true, userId };
}

const OrderInput = z.object({
  userId: z.string().min(1, 'Missing customer.'),
  serviceId: z.coerce.number().int().positive('Choose a service.'),
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
  requestedCredit: z.coerce.number().int().min(0).max(10_000_000).default(0),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
  priceOverride: z
    .string()
    .optional()
    .transform((v) => (v && v !== '' ? Number(v) : undefined))
    .refine((v) => v === undefined || (Number.isInteger(v) && v >= 0), {
      message: 'Custom price must be a whole number, 0 or more.',
    }),
});

const MESSAGES: Record<string, string> = {
  'no-profile': 'This customer has no profile on file.',
  'service-unavailable': 'That service is no longer available.',
  'slot-unavailable': 'That time window is no longer available.',
  'area-unavailable': "We are not currently booking in this customer's area.",
  'not-priced': 'That combination is not priced. Set a custom price to continue.',
  'slot-full': 'That window just filled up. Please pick another.',
};

/** Places an order on behalf of an existing or just-created customer. */
export async function createOrderForCustomer(formData: FormData): Promise<CreateOrderResult> {
  const admin = await requireManage('orders');

  const parsed = OrderInput.safeParse({
    userId: formData.get('userId'),
    serviceId: formData.get('serviceId'),
    optionIds: formData.get('optionIds'),
    scheduledDate: formData.get('scheduledDate'),
    slotId: formData.get('slotId'),
    requestedCredit: formData.get('requestedCredit') || 0,
    notes: formData.get('notes'),
    priceOverride: formData.get('priceOverride'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the form.' };
  }

  const { userId, serviceId, optionIds, scheduledDate, slotId, requestedCredit, notes, priceOverride } = parsed.data;

  const today = new Date().toISOString().slice(0, 10);
  if (scheduledDate < today) {
    return { ok: false, error: 'Choose a date from today onwards.' };
  }

  const result = await placeOrder(db(), {
    userId,
    serviceId,
    optionIds,
    scheduledDate,
    slotId,
    requestedCredit,
    notes: notes || null,
    priceOverride,
    placedByAdminId: admin.id,
  });

  if (!result.ok) {
    await audit({
      action: 'orders.place',
      module: 'orders',
      targetType: 'service',
      targetId: serviceId,
      outcome: 'ERROR',
      reason: result.reason,
      detail: { userId, scheduledDate, slotId, requestedCredit, priceOverride: priceOverride ?? null },
    });
    return { ok: false, error: MESSAGES[result.reason] ?? 'Could not place that order.' };
  }

  await audit({
    action: 'orders.place',
    module: 'orders',
    targetType: 'order',
    targetId: result.orderId,
    targetLabel: result.code,
    detail: {
      userId,
      serviceId,
      optionIds,
      scheduledDate,
      slotId,
      creditApplied: result.creditApplied,
      priceOverride: priceOverride ?? null,
    },
  });

  revalidatePath('/admin/orders');
  revalidatePath('/admin/customers');
  return { ok: true, code: result.code };
}
