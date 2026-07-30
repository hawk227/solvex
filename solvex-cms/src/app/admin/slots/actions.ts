'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { schema, isUniqueViolation } from '@solvex/db';
import { db } from '@/lib/cf';
import { requireManage } from '@/lib/session';
import { audit } from '@/lib/audit';

export type ActionResult = { ok: true } | { ok: false; error: string };

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const SlotInput = z
  .object({
    label: z.string().trim().min(2, 'Label must be at least 2 characters.').max(60),
    startTime: z.string().regex(TIME, 'Start time must be HH:MM, 24-hour.'),
    endTime: z.string().regex(TIME, 'End time must be HH:MM, 24-hour.'),
    sort: z.coerce.number().int().min(0).max(9999).default(0),
  })
  // Times are Asia/Dhaka wall-clock strings, so a plain string compare is a
  // correct ordering test — no timezone maths needed.
  .refine((v) => v.startTime < v.endTime, {
    message: 'End time must be after start time.',
    path: ['endTime'],
  });

function parse(formData: FormData) {
  return SlotInput.safeParse({
    label: formData.get('label'),
    startTime: formData.get('startTime'),
    endTime: formData.get('endTime'),
    sort: formData.get('sort') || 0,
  });
}

export async function createSlot(formData: FormData): Promise<ActionResult> {
  await requireManage('settings');
  const parsed = parse(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  try {
    await db().insert(schema.slotTemplates).values(parsed.data);
  } catch (err) {
    if (isUniqueViolation(err, 'slot_templates.label')) {
      return { ok: false, error: `A slot labelled "${parsed.data.label}" already exists.` };
    }
    throw err;
  }

  await audit({
    action: 'settings.slot.create',
    module: 'settings',
    targetType: 'slot',
    targetLabel: parsed.data.label,
    detail: parsed.data,
  });

  revalidatePath('/admin/slots');
  return { ok: true };
}

export async function updateSlot(id: number, formData: FormData): Promise<ActionResult> {
  await requireManage('settings');
  const parsed = parse(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  try {
    await db().update(schema.slotTemplates).set(parsed.data).where(eq(schema.slotTemplates.id, id));
  } catch (err) {
    if (isUniqueViolation(err, 'slot_templates.label')) {
      return { ok: false, error: `A slot labelled "${parsed.data.label}" already exists.` };
    }
    throw err;
  }

  await audit({
    action: 'settings.slot.update',
    module: 'settings',
    targetType: 'slot',
    targetId: id,
    targetLabel: parsed.data.label,
    detail: parsed.data,
  });

  revalidatePath('/admin/slots');
  return { ok: true };
}

export async function setSlotActive(id: number, active: boolean): Promise<ActionResult> {
  await requireManage('settings');
  await db().update(schema.slotTemplates).set({ active }).where(eq(schema.slotTemplates.id, id));
  await audit({
    action: active ? 'settings.slot.activate' : 'settings.slot.deactivate',
    module: 'settings',
    targetType: 'slot',
    targetId: id,
  });
  revalidatePath('/admin/slots');
  return { ok: true };
}

const CapacityInput = z.object({
  slotId: z.coerce.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD.'),
  capacity: z.coerce.number().int().min(0).max(999),
});

/**
 * Per-day capacity override. Writing a row that equals the default would be
 * noise, so callers clear the override by deleting instead — see
 * `clearCapacityOverride`.
 */
export async function setCapacityOverride(formData: FormData): Promise<ActionResult> {
  await requireManage('settings');

  const parsed = CapacityInput.safeParse({
    slotId: formData.get('slotId'),
    date: formData.get('date'),
    capacity: formData.get('capacity'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const { slotId, date, capacity } = parsed.data;

  await db()
    .insert(schema.slotCapacity)
    .values({ slotId, date, capacity })
    .onConflictDoUpdate({
      target: [schema.slotCapacity.date, schema.slotCapacity.slotId],
      set: { capacity },
    });

  await audit({
    action: 'settings.capacity.override',
    module: 'settings',
    targetType: 'slot',
    targetId: slotId,
    targetLabel: date,
    detail: { date, capacity },
  });

  revalidatePath('/admin/slots');
  return { ok: true };
}

export async function clearCapacityOverride(date: string, slotId: number): Promise<ActionResult> {
  await requireManage('settings');

  await db()
    .delete(schema.slotCapacity)
    .where(and(eq(schema.slotCapacity.date, date), eq(schema.slotCapacity.slotId, slotId)));

  await audit({
    action: 'settings.capacity.clear',
    module: 'settings',
    targetType: 'slot',
    targetId: slotId,
    targetLabel: date,
    detail: { date },
  });

  revalidatePath('/admin/slots');
  return { ok: true };
}
