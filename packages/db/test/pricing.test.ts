import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { getDb, schema } from '../src/index';
import { PriceNotFoundError, buildComboKey, expandCombinations, lookupPrice } from '../src/pricing';

describe('buildComboKey', () => {
  it('is independent of selection order', () => {
    expect(buildComboKey([7, 2, 5])).toBe(buildComboKey([5, 7, 2]));
  });

  it('sorts numerically, not lexically', () => {
    expect(buildComboKey([10, 9])).toBe('9-10');
  });

  it('returns the empty string for a service with no variables', () => {
    expect(buildComboKey([])).toBe('');
  });

  it('rejects duplicate option ids', () => {
    expect(() => buildComboKey([3, 3])).toThrow(/duplicate/i);
  });
});

describe('expandCombinations', () => {
  it('produces the cartesian product, one key per combination', () => {
    const keys = expandCombinations([
      { id: 1, options: [{ id: 10 }, { id: 11 }] },
      { id: 2, options: [{ id: 20 }, { id: 21 }] },
    ]);
    expect(keys.sort()).toEqual(['10-20', '10-21', '11-20', '11-21']);
  });

  it('returns a single empty key when there are no groups', () => {
    expect(expandCombinations([])).toEqual(['']);
  });
});

describe('lookupPrice', () => {
  it('finds the price for a combination regardless of selection order', async () => {
    const db = getDb(env.DB);
    const [category] = await db
      .insert(schema.categories)
      .values({ slug: `c-${crypto.randomUUID()}`, name: 'C' })
      .returning();
    const [service] = await db
      .insert(schema.services)
      .values({ categoryId: category!.id, slug: `s-${crypto.randomUUID()}`, name: 'S' })
      .returning();

    await db
      .insert(schema.servicePrices)
      .values({ serviceId: service!.id, comboKey: '4-9', price: 2200 });

    await expect(lookupPrice(db, service!.id, [9, 4])).resolves.toBe(2200);
  });

  it('throws PriceNotFoundError instead of defaulting to a price', async () => {
    const db = getDb(env.DB);
    const [category] = await db
      .insert(schema.categories)
      .values({ slug: `c-${crypto.randomUUID()}`, name: 'C' })
      .returning();
    const [service] = await db
      .insert(schema.services)
      .values({ categoryId: category!.id, slug: `s-${crypto.randomUUID()}`, name: 'S' })
      .returning();

    await expect(lookupPrice(db, service!.id, [1, 2])).rejects.toBeInstanceOf(PriceNotFoundError);
  });
});
