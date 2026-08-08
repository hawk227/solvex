'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { schema, isUniqueViolation } from '@solvex/db';
import { db } from '@/lib/cf';
import { requireManage } from '@/lib/session';
import { audit } from '@/lib/audit';

export type ActionResult = { ok: true } | { ok: false; error: string };

// ---------------------------------------------------------------- zones

const ZoneInput = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(80),
  sort: z.coerce.number().int().min(0).max(9999).default(0),
});

export async function createZone(formData: FormData): Promise<ActionResult> {
  await requireManage('settings');

  const parsed = ZoneInput.safeParse({
    name: formData.get('name'),
    sort: formData.get('sort') || 0,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  try {
    await db().insert(schema.zones).values(parsed.data);
  } catch (err) {
    if (isUniqueViolation(err, 'zones.name')) {
      return { ok: false, error: `"${parsed.data.name}" is already a zone.` };
    }
    throw err;
  }

  await audit({
    action: 'settings.zone.create',
    module: 'settings',
    targetType: 'zone',
    targetLabel: parsed.data.name,
    detail: parsed.data,
  });

  revalidatePath('/admin/areas');
  return { ok: true };
}

export async function updateZone(id: number, formData: FormData): Promise<ActionResult> {
  await requireManage('settings');

  const parsed = ZoneInput.safeParse({
    name: formData.get('name'),
    sort: formData.get('sort') || 0,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  try {
    await db().update(schema.zones).set(parsed.data).where(eq(schema.zones.id, id));
  } catch (err) {
    if (isUniqueViolation(err, 'zones.name')) {
      return { ok: false, error: `"${parsed.data.name}" is already a zone.` };
    }
    throw err;
  }

  await audit({
    action: 'settings.zone.update',
    module: 'settings',
    targetType: 'zone',
    targetId: id,
    targetLabel: parsed.data.name,
    detail: parsed.data,
  });

  revalidatePath('/admin/areas');
  return { ok: true };
}

/**
 * Deactivating a zone does NOT touch the areas inside it. An area's own
 * `active` flag is what actually stops booking — see setAreaActive — so a
 * paused zone just stops offering itself as an organising step in the picker,
 * without silently taking a working area down with it.
 */
export async function setZoneActive(id: number, active: boolean): Promise<ActionResult> {
  await requireManage('settings');
  await db().update(schema.zones).set({ active }).where(eq(schema.zones.id, id));
  await audit({
    action: active ? 'settings.zone.activate' : 'settings.zone.deactivate',
    module: 'settings',
    targetType: 'zone',
    targetId: id,
  });
  revalidatePath('/admin/areas');
  return { ok: true };
}

// ---------------------------------------------------------------- areas

const AreaInput = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(80),
  // '' means "no zone" — coming from a <select> with an empty option, not a
  // missing field, so it is handled explicitly rather than by z.coerce, which
  // would turn '' into 0 and point at a zone id that does not exist.
  zoneId: z
    .string()
    .optional()
    .transform((v) => (v && v !== '' ? Number(v) : null)),
  sort: z.coerce.number().int().min(0).max(9999).default(0),
});

export async function createArea(formData: FormData): Promise<ActionResult> {
  await requireManage('settings');

  const parsed = AreaInput.safeParse({
    name: formData.get('name'),
    zoneId: formData.get('zoneId'),
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

  await audit({
    action: 'settings.area.create',
    module: 'settings',
    targetType: 'area',
    targetLabel: parsed.data.name,
    detail: parsed.data,
  });

  revalidatePath('/admin/areas');
  return { ok: true };
}

export async function updateArea(id: number, formData: FormData): Promise<ActionResult> {
  await requireManage('settings');

  const parsed = AreaInput.safeParse({
    name: formData.get('name'),
    zoneId: formData.get('zoneId'),
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

  await audit({
    action: 'settings.area.update',
    module: 'settings',
    targetType: 'area',
    targetId: id,
    targetLabel: parsed.data.name,
    detail: parsed.data,
  });

  revalidatePath('/admin/areas');
  return { ok: true };
}

/**
 * Deactivating an area stops NEW bookings there. Existing orders keep their
 * area, since an order records where a technician was actually sent.
 */
export async function setAreaActive(id: number, active: boolean): Promise<ActionResult> {
  await requireManage('settings');
  await db().update(schema.areas).set({ active }).where(eq(schema.areas.id, id));
  await audit({
    action: active ? 'settings.area.activate' : 'settings.area.deactivate',
    module: 'settings',
    targetType: 'area',
    targetId: id,
  });
  revalidatePath('/admin/areas');
  return { ok: true };
}

// ---------------------------------------------------------------- locations

const LocationInput = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(80),
  areaId: z.coerce.number().int().positive('Choose an area.'),
  sort: z.coerce.number().int().min(0).max(9999).default(0),
});

export async function createLocation(formData: FormData): Promise<ActionResult> {
  await requireManage('settings');

  const parsed = LocationInput.safeParse({
    name: formData.get('name'),
    areaId: formData.get('areaId'),
    sort: formData.get('sort') || 0,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  // Unlike zones and areas, location names are not globally unique — "Nikunja"
  // could plausibly appear once under Uttara and, in a different city, again
  // elsewhere. Nothing in the product needs it enforced.
  await db().insert(schema.locations).values(parsed.data);

  await audit({
    action: 'settings.location.create',
    module: 'settings',
    targetType: 'location',
    targetLabel: parsed.data.name,
    detail: parsed.data,
  });

  revalidatePath('/admin/areas');
  return { ok: true };
}

export async function updateLocation(id: number, formData: FormData): Promise<ActionResult> {
  await requireManage('settings');

  const parsed = LocationInput.safeParse({
    name: formData.get('name'),
    areaId: formData.get('areaId'),
    sort: formData.get('sort') || 0,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  await db().update(schema.locations).set(parsed.data).where(eq(schema.locations.id, id));

  await audit({
    action: 'settings.location.update',
    module: 'settings',
    targetType: 'location',
    targetId: id,
    targetLabel: parsed.data.name,
    detail: parsed.data,
  });

  revalidatePath('/admin/areas');
  return { ok: true };
}

export async function setLocationActive(id: number, active: boolean): Promise<ActionResult> {
  await requireManage('settings');
  await db().update(schema.locations).set({ active }).where(eq(schema.locations.id, id));
  await audit({
    action: active ? 'settings.location.activate' : 'settings.location.deactivate',
    module: 'settings',
    targetType: 'location',
    targetId: id,
  });
  revalidatePath('/admin/areas');
  return { ok: true };
}
