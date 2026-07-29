import { and, eq } from 'drizzle-orm';
import type { Db } from './index';
import { servicePrices } from './schema/catalog';

export class PriceNotFoundError extends Error {
  constructor(serviceId: number, comboKey: string) {
    super(`No price configured for service ${serviceId}, combination "${comboKey}"`);
    this.name = 'PriceNotFoundError';
  }
}

/**
 * Canonical key for a set of selected variable options: ids sorted ascending
 * and joined by "-". Sorting is what makes the key stable regardless of the
 * order the customer picked options in.
 */
export function buildComboKey(optionIds: number[]): string {
  const unique = new Set(optionIds);
  if (unique.size !== optionIds.length) {
    throw new Error(`buildComboKey received duplicate option ids: ${optionIds.join(',')}`);
  }
  return [...optionIds].sort((a, b) => a - b).join('-');
}

/**
 * Every combination of one option per group, as combo keys. Used by the CMS
 * to generate the price matrix and to report which combinations are unpriced.
 */
export function expandCombinations(groups: { id: number; options: { id: number }[] }[]): string[] {
  let acc: number[][] = [[]];
  for (const group of groups) {
    const next: number[][] = [];
    for (const partial of acc) {
      for (const option of group.options) {
        next.push([...partial, option.id]);
      }
    }
    acc = next;
  }
  return acc.map(buildComboKey);
}

/** Price in integer BDT taka. Throws rather than guessing at a default. */
export async function lookupPrice(db: Db, serviceId: number, optionIds: number[]): Promise<number> {
  const comboKey = buildComboKey(optionIds);
  const row = await db
    .select({ price: servicePrices.price })
    .from(servicePrices)
    .where(and(eq(servicePrices.serviceId, serviceId), eq(servicePrices.comboKey, comboKey)))
    .get();

  if (!row) throw new PriceNotFoundError(serviceId, comboKey);
  return row.price;
}
