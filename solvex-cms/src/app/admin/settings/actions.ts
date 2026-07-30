'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { schema } from '@solvex/db';
import { db } from '@/lib/cf';
import { requireManage } from '@/lib/session';

export type ActionResult = { ok: true } | { ok: false; error: string };

const SettingsInput = z.object({
  default_slot_capacity: z.coerce
    .number()
    .int()
    .min(0, 'Capacity cannot be negative.')
    .max(999, 'Capacity is unrealistically high.'),
  referral_reward_taka: z.coerce
    .number()
    .int()
    .min(0, 'Reward cannot be negative.')
    .max(100000, 'Reward is unrealistically high.'),
});

export async function saveSettings(formData: FormData): Promise<ActionResult> {
  await requireManage('settings');

  const parsed = SettingsInput.safeParse({
    default_slot_capacity: formData.get('default_slot_capacity'),
    referral_reward_taka: formData.get('referral_reward_taka'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const d = db();
  for (const [key, value] of Object.entries(parsed.data)) {
    await d
      .insert(schema.settings)
      .values({ key, value: String(value) })
      .onConflictDoUpdate({ target: schema.settings.key, set: { value: String(value) } });
  }

  revalidatePath('/admin/settings');
  revalidatePath('/admin/slots');
  return { ok: true };
}
