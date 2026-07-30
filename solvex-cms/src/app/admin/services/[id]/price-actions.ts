'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { schema, expandCombinations } from '@solvex/db';
import { db } from '@/lib/cf';
import { requireAdmin } from '@/lib/session';

export type ActionResult = { ok: true; written?: number } | { ok: false; error: string };

const Price = z.coerce
  .number()
  .int('Prices are whole taka — no decimals.')
  .min(0, 'Price cannot be negative.')
  .max(10_000_000, 'Price is unrealistically high.');

/** Current combinations for a service, derived from its variable groups. */
async function combinationsFor(serviceId: number): Promise<string[]> {
  const d = db();
  const groups = await d
    .select({ id: schema.variableGroups.id })
    .from(schema.variableGroups)
    .where(eq(schema.variableGroups.serviceId, serviceId))
    .orderBy(schema.variableGroups.sort);

  const withOptions = await Promise.all(
    groups.map(async (g) => ({
      id: g.id,
      options: await d
        .select({ id: schema.variableOptions.id })
        .from(schema.variableOptions)
        .where(eq(schema.variableOptions.groupId, g.id))
        .orderBy(schema.variableOptions.sort),
    })),
  );

  // A group with no options yields no combinations at all, which would wipe
  // the matrix. Treat it as "not yet configured" instead.
  if (withOptions.some((g) => g.options.length === 0)) return [];

  return expandCombinations(withOptions);
}

/**
 * Write one price for one combination.
 */
export async function setPrice(
  serviceId: number,
  comboKey: string,
  rawPrice: FormDataEntryValue | null,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = Price.safeParse(rawPrice);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid.' };

  await db()
    .insert(schema.servicePrices)
    .values({ serviceId, comboKey, price: parsed.data })
    .onConflictDoUpdate({
      target: [schema.servicePrices.serviceId, schema.servicePrices.comboKey],
      set: { price: parsed.data },
    });

  revalidatePath(`/admin/services/${serviceId}`);
  return { ok: true, written: 1 };
}

/**
 * Bulk-fill the whole matrix.
 *
 * Not optional convenience: two variable groups of four options is sixteen
 * rows and three groups is sixty-four, so entering every combination by hand
 * is unusable at realistic sizes. `onlyEmpty` fills the gaps left after
 * setting outliers by hand.
 */
export async function bulkFillPrices(
  serviceId: number,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = Price.safeParse(formData.get('price'));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid.' };

  const onlyEmpty = formData.get('onlyEmpty') === 'on';
  const price = parsed.data;

  const combos = await combinationsFor(serviceId);
  if (combos.length === 0) {
    return { ok: false, error: 'Give every variable group at least one option first.' };
  }

  const d = db();
  const existing = await d
    .select({ comboKey: schema.servicePrices.comboKey })
    .from(schema.servicePrices)
    .where(eq(schema.servicePrices.serviceId, serviceId));
  const priced = new Set(existing.map((r) => r.comboKey));

  const targets = onlyEmpty ? combos.filter((c) => !priced.has(c)) : combos;
  if (targets.length === 0) return { ok: true, written: 0 };

  // D1 caps how many bound parameters one statement may carry, so write in
  // chunks rather than one enormous insert.
  const CHUNK = 50;
  for (let i = 0; i < targets.length; i += CHUNK) {
    const slice = targets.slice(i, i + CHUNK);
    await d
      .insert(schema.servicePrices)
      .values(slice.map((comboKey) => ({ serviceId, comboKey, price })))
      .onConflictDoUpdate({
        target: [schema.servicePrices.serviceId, schema.servicePrices.comboKey],
        set: { price },
      });
  }

  revalidatePath(`/admin/services/${serviceId}`);
  return { ok: true, written: targets.length };
}

/** Remove a price so the combination shows as unpriced again. */
export async function clearPrice(serviceId: number, comboKey: string): Promise<ActionResult> {
  await requireAdmin();

  await db()
    .delete(schema.servicePrices)
    .where(
      and(
        eq(schema.servicePrices.serviceId, serviceId),
        eq(schema.servicePrices.comboKey, comboKey),
      ),
    );

  revalidatePath(`/admin/services/${serviceId}`);
  return { ok: true };
}
