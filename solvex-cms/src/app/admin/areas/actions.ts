'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { schema, isUniqueViolation } from '@solvex/db';
import { db } from '@/lib/cf';
import { requireAdmin } from '@/lib/session';

export type ActionResult = { ok: true } | { ok: false; error: string };

const AreaInput = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(80),
  sort: z.coerce.number().int().min(0).max(9999).default(0),
});

export async function createArea(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const parsed = AreaInput.safeParse({
    name: formData.get('name'),
    sort: formData.get('sort') || 0,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  try {
    await db().insert(schema.areas).values(parsed.data);
  } catch (err) {
    if (isUniqueViolation(err, 'areas.name')) {
      return { ok: false, error: `"${parsed.data.name}" is already a serviceable area.` };
    }
    throw err;
  }

  revalidatePath('/admin/areas');
  return { ok: true };
}

export async function updateArea(id: number, formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const parsed = AreaInput.safeParse({
    name: formData.get('name'),
    sort: formData.get('sort') || 0,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  try {
    await db().update(schema.areas).set(parsed.data).where(eq(schema.areas.id, id));
  } catch (err) {
    if (isUniqueViolation(err, 'areas.name')) {
      return { ok: false, error: `"${parsed.data.name}" is already a serviceable area.` };
    }
    throw err;
  }

  revalidatePath('/admin/areas');
  return { ok: true };
}

/**
 * Deactivating an area stops NEW bookings there. Existing orders keep their
 * area, since an order records where a technician was actually sent.
 */
export async function setAreaActive(id: number, active: boolean): Promise<ActionResult> {
  await requireAdmin();
  await db().update(schema.areas).set({ active }).where(eq(schema.areas.id, id));
  revalidatePath('/admin/areas');
  return { ok: true };
}
