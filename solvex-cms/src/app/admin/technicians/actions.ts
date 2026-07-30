'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { isUniqueViolation, schema, setTechnicianCoverage } from '@solvex/db';
import { db } from '@/lib/cf';
import { requireManage } from '@/lib/session';
import { optionalText } from '@/lib/form';
import { normaliseBdMobile } from '@/lib/phone';

export type ActionResult = { ok: true; id?: number } | { ok: false; error: string };

const TechnicianInput = z.object({
  fullName: z.string().trim().min(2, 'Enter the technician’s full name.').max(80),
  // Normalised so dispatch always has one dialable form, same as customers.
  phone: z
    .string()
    .transform((v) => normaliseBdMobile(v))
    .refine((v): v is string => v !== null, 'Enter a Bangladeshi mobile number, e.g. 01712345678.'),
  email: z
    .string()
    .trim()
    .email('Enter a valid email, or leave it blank.')
    .optional()
    .or(z.literal('')),
  baseArea: optionalText(80),
  joinedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the date picker.')
    .optional()
    .or(z.literal('')),
  notes: optionalText(500),
});

function parseCoverage(formData: FormData) {
  const ints = (key: string) =>
    formData
      .getAll(key)
      .map((v) => Number.parseInt(String(v), 10))
      .filter((n) => Number.isInteger(n) && n > 0);
  return { categoryIds: ints('categoryIds'), areaIds: ints('areaIds') };
}

function parse(formData: FormData) {
  return TechnicianInput.safeParse({
    fullName: formData.get('fullName'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    baseArea: formData.get('baseArea'),
    joinedOn: formData.get('joinedOn'),
    notes: formData.get('notes'),
  });
}

export async function createTechnician(formData: FormData): Promise<ActionResult> {
  await requireManage('technicians');

  const parsed = parse(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the form.' };
  }

  const { fullName, phone, email, baseArea, joinedOn, notes } = parsed.data;
  const { categoryIds, areaIds } = parseCoverage(formData);

  try {
    const [row] = await db()
      .insert(schema.technicians)
      .values({
        fullName,
        phone,
        email: email || null,
        baseArea: baseArea || null,
        joinedOn: joinedOn || null,
        notes: notes || null,
      })
      .returning({ id: schema.technicians.id });

    if (row) await setTechnicianCoverage(db(), row.id, categoryIds, areaIds);

    revalidatePath('/admin/technicians');
    return { ok: true, id: row?.id };
  } catch (err) {
    if (isUniqueViolation(err, 'technicians.phone')) {
      return { ok: false, error: 'A technician with that mobile number already exists.' };
    }
    throw err;
  }
}

export async function updateTechnician(id: number, formData: FormData): Promise<ActionResult> {
  await requireManage('technicians');

  const parsed = parse(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the form.' };
  }

  const { fullName, phone, email, baseArea, joinedOn, notes } = parsed.data;
  const { categoryIds, areaIds } = parseCoverage(formData);

  try {
    await db()
      .update(schema.technicians)
      .set({
        fullName,
        phone,
        email: email || null,
        baseArea: baseArea || null,
        joinedOn: joinedOn || null,
        notes: notes || null,
      })
      .where(eq(schema.technicians.id, id));

    await setTechnicianCoverage(db(), id, categoryIds, areaIds);
  } catch (err) {
    if (isUniqueViolation(err, 'technicians.phone')) {
      return { ok: false, error: 'A technician with that mobile number already exists.' };
    }
    throw err;
  }

  revalidatePath('/admin/technicians');
  return { ok: true };
}

/**
 * Take a technician on or off the rota.
 *
 * This is the only way to retire someone — technicians are never deleted, because
 * that would erase who attended past jobs. An inactive technician cannot be
 * assigned to new work but stays on the orders they already did.
 */
export async function setTechnicianActive(id: number, active: boolean): Promise<ActionResult> {
  await requireManage('technicians');
  await db().update(schema.technicians).set({ active }).where(eq(schema.technicians.id, id));
  revalidatePath('/admin/technicians');
  revalidatePath('/admin/orders');
  return { ok: true };
}
