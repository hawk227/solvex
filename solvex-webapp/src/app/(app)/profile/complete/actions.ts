'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import {
  schema,
  isUniqueViolation,
  normaliseBdMobile,
  findWalkInByPhone,
  mergeWalkInIntoRealAccount,
} from '@solvex/db';
import { db } from '@/lib/cf';
import { requireCustomer } from '@/lib/session';
import { audit } from '@/lib/audit';

export type ActionResult = { ok: true } | { ok: false; error: string };

const ProfileInput = z.object({
  fullName: z.string().trim().min(2, 'Please enter your full name.').max(80),
  // Normalised so every stored number is dialable in one canonical form.
  phone: z
    .string()
    .transform((v) => normaliseBdMobile(v))
    .refine((v): v is string => v !== null, 'Enter a Bangladeshi mobile number, e.g. 01712345678.'),
  address: z.string().trim().min(10, 'Please give enough detail for a technician to find you.').max(300),
  areaId: z.coerce.number().int().positive('Choose your area.'),
  // Handles all three shapes FormData can hand back for this field: '' from
  // an unselected <select>, undefined if never wired up, and — the one that
  // actually happens here — null, because the AddressPicker does not render
  // a location <select> at all for an area with none (Uttara, Mirpur). A bare
  // z.string().optional() rejects null outright, which would have failed
  // profile saves for exactly those areas.
  locationId: z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v && v !== '' ? Number(v) : null)),
});

/** Referral codes are shown to other people, so avoid ambiguous characters. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateReferralCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

export async function saveProfile(formData: FormData): Promise<ActionResult> {
  const customer = await requireCustomer();

  const parsed = ProfileInput.safeParse({
    fullName: formData.get('fullName'),
    phone: formData.get('phone'),
    address: formData.get('address'),
    areaId: formData.get('areaId'),
    locationId: formData.get('locationId'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the form.' };
  }

  const { fullName, phone, address, areaId, locationId } = parsed.data;
  const d = db();

  // Only active areas are selectable — a paused area must not accept bookings
  // just because someone kept a stale form open.
  const [area] = await d
    .select({ id: schema.areas.id })
    .from(schema.areas)
    .where(eq(schema.areas.id, areaId))
    .limit(1);
  if (!area) return { ok: false, error: 'That area is no longer available. Pick another.' };

  // A location is validated against the area it claims to belong to, not
  // trusted from the client. The picker keeps them in sync in the browser, but
  // the server is what actually stops a mismatched pair — e.g. the area was
  // just changed but a stale locationId from the old one is still in the
  // submitted form — from being stored as though they agreed.
  if (locationId !== null) {
    const [location] = await d
      .select({ id: schema.locations.id })
      .from(schema.locations)
      .where(and(eq(schema.locations.id, locationId), eq(schema.locations.areaId, areaId)))
      .limit(1);
    if (!location) {
      return { ok: false, error: 'That location does not match the selected area.' };
    }
  }

  const existing = await d
    .select({ userId: schema.profiles.userId })
    .from(schema.profiles)
    .where(eq(schema.profiles.userId, customer.id))
    .limit(1);

  if (existing.length > 0) {
    // The referral code is never regenerated: people have already shared it.
    await d
      .update(schema.profiles)
      .set({ fullName, phone, address, areaId, locationId })
      .where(eq(schema.profiles.userId, customer.id));
  } else {
    // Retry on the astronomically unlikely code collision rather than failing
    // the customer's first save.
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await d.insert(schema.profiles).values({
          userId: customer.id,
          fullName,
          phone,
          address,
          areaId,
          locationId,
          referralCode: generateReferralCode(),
        });
        break;
      } catch (err) {
        if (isUniqueViolation(err, 'profiles.referral_code') && attempt < 4) continue;
        throw err;
      }
    }
  }

  // Which fields were set, not their contents. The audit database should not
  // become a second copy of every customer's home address and phone number —
  // those already live in `profiles`, under the deletion rules that apply there.
  await audit({
    action: existing.length > 0 ? 'profile.update' : 'profile.create',
    targetType: 'profile',
    targetId: customer.id,
    targetLabel: fullName,
    detail: { areaId, locationId, phoneSet: Boolean(phone), addressSet: Boolean(address) },
  });

  // A walk-in customer created from the CMS phone-order flow uses a synthetic
  // email keyed to their phone number (see @solvex/db's walkin.ts). If this
  // real signup used the same phone, fold that walk-in's order and credit
  // history onto this account. A failure here must never block the customer's
  // own profile save, which has already succeeded by this point.
  const walkInMatch = await findWalkInByPhone(d, phone);
  if (walkInMatch) {
    try {
      const merged = await mergeWalkInIntoRealAccount(d, {
        walkInUserId: walkInMatch.userId,
        realUserId: customer.id,
      });
      await audit({
        action: 'profile.merge-walkin',
        targetType: 'profile',
        targetId: customer.id,
        detail: merged,
      });
    } catch (err) {
      await audit({
        action: 'profile.merge-walkin',
        targetType: 'profile',
        targetId: customer.id,
        outcome: 'ERROR',
        reason: err instanceof Error ? err.message : 'unknown error',
      });
    }
  }

  revalidatePath('/account');
  revalidatePath('/profile/complete');
  return { ok: true };
}
