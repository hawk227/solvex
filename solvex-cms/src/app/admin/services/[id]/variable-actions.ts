'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { schema } from '@solvex/db';
import { db } from '@/lib/cf';
import { requireAdmin } from '@/lib/session';

export type ActionResult = { ok: true } | { ok: false; error: string };

const Name = z.string().trim().min(1, 'Name is required.').max(60);

export async function addVariableGroup(
  serviceId: number,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = Name.safeParse(formData.get('name'));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid.' };

  const d = db();
  const existing = await d
    .select({ id: schema.variableGroups.id })
    .from(schema.variableGroups)
    .where(eq(schema.variableGroups.serviceId, serviceId));

  await d
    .insert(schema.variableGroups)
    .values({ serviceId, name: parsed.data, sort: existing.length });

  // Adding a group changes the set of valid combinations, so previously stored
  // prices no longer describe a full selection. They are cleared rather than
  // left to be matched against keys that can never be produced again.
  await d.delete(schema.servicePrices).where(eq(schema.servicePrices.serviceId, serviceId));

  revalidatePath(`/admin/services/${serviceId}`);
  return { ok: true };
}

export async function deleteVariableGroup(
  serviceId: number,
  groupId: number,
): Promise<ActionResult> {
  await requireAdmin();

  const d = db();
  // Options cascade with the group; prices are cleared for the same reason as
  // in addVariableGroup.
  await d.delete(schema.variableGroups).where(eq(schema.variableGroups.id, groupId));
  await d.delete(schema.servicePrices).where(eq(schema.servicePrices.serviceId, serviceId));

  revalidatePath(`/admin/services/${serviceId}`);
  return { ok: true };
}

export async function addVariableOption(
  serviceId: number,
  groupId: number,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = Name.safeParse(formData.get('label'));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid.' };

  const d = db();
  const existing = await d
    .select({ id: schema.variableOptions.id })
    .from(schema.variableOptions)
    .where(eq(schema.variableOptions.groupId, groupId));

  await d
    .insert(schema.variableOptions)
    .values({ groupId, label: parsed.data, sort: existing.length });

  await d.delete(schema.servicePrices).where(eq(schema.servicePrices.serviceId, serviceId));

  revalidatePath(`/admin/services/${serviceId}`);
  return { ok: true };
}

export async function deleteVariableOption(
  serviceId: number,
  optionId: number,
): Promise<ActionResult> {
  await requireAdmin();

  const d = db();
  await d.delete(schema.variableOptions).where(eq(schema.variableOptions.id, optionId));
  await d.delete(schema.servicePrices).where(eq(schema.servicePrices.serviceId, serviceId));

  revalidatePath(`/admin/services/${serviceId}`);
  return { ok: true };
}
