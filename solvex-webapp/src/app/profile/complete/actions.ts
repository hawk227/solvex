'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { schema, isUniqueViolation } from '@solvex/db';
import { db } from '@/lib/cf';
import { requireCustomer } from '@/lib/session';
import { normaliseBdMobile } from '@/lib/phone';

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
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the form.' };
  }

  const { fullName, phone, address, areaId } = parsed.data;
  const d = db();

  // Only active areas are selectable — a paused area must not accept bookings
  // just because someone kept a stale form open.
  const [area] = await d
    .select({ id: schema.areas.id })
    .from(schema.areas)
    .where(eq(schema.areas.id, areaId))
    .limit(1);
  if (!area) return { ok: false, error: 'That area is no longer available. Pick another.' };

  const existing = await d
    .select({ userId: schema.profiles.userId })
    .from(schema.profiles)
    .where(eq(schema.profiles.userId, customer.id))
    .limit(1);

  if (existing.length > 0) {
    // The referral code is never regenerated: people have already shared it.
    await d
      .update(schema.profiles)
      .set({ fullName, phone, address, areaId })
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
          referralCode: generateReferralCode(),
        });
        break;
      } catch (err) {
        if (isUniqueViolation(err, 'profiles.referral_code') && attempt < 4) continue;
        throw err;
      }
    }
  }

  revalidatePath('/account');
  revalidatePath('/profile/complete');
  return { ok: true };
}
