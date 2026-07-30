import { env } from 'cloudflare:test';
import { asc, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { getDb, schema } from '../src/index';
import {
  activeServiceCount,
  minServicePrice,
  servicePriceCount,
  variableGroupCount,
} from '../src/aggregates';

/**
 * These guard against a failure mode that produces plausible wrong numbers
 * rather than an error: a correlated subquery whose outer column is emitted
 * unqualified binds to the inner table, so every row returns the same count.
 * Each test therefore uses rows with DIFFERENT expected values.
 */
describe('activeServiceCount', () => {
  it('counts each category separately and ignores inactive services', async () => {
    const db = getDb(env.DB);
    const tag = crypto.randomUUID().slice(0, 8);

    const [two] = await db
      .insert(schema.categories)
      .values({ slug: `two-${tag}`, name: 'Two' })
      .returning();
    const [one] = await db
      .insert(schema.categories)
      .values({ slug: `one-${tag}`, name: 'One' })
      .returning();
    const [none] = await db
      .insert(schema.categories)
      .values({ slug: `none-${tag}`, name: 'None' })
      .returning();

    await db.insert(schema.services).values([
      { categoryId: two!.id, slug: `a-${tag}`, name: 'A' },
      { categoryId: two!.id, slug: `b-${tag}`, name: 'B' },
      { categoryId: one!.id, slug: `c-${tag}`, name: 'C' },
      // Inactive: must not be counted.
      { categoryId: one!.id, slug: `d-${tag}`, name: 'D', active: false },
    ]);

    const rows = await db
      .select({ slug: schema.categories.slug, n: activeServiceCount })
      .from(schema.categories)
      .orderBy(asc(schema.categories.id));

    const bySlug = new Map(rows.map((r) => [r.slug, Number(r.n)]));
    expect(bySlug.get(`two-${tag}`)).toBe(2);
    expect(bySlug.get(`one-${tag}`)).toBe(1);
    expect(bySlug.get(`none-${tag}`)).toBe(0);
  });
});

describe('service price aggregates', () => {
  it('reports the minimum price and row count per service', async () => {
    const db = getDb(env.DB);
    const tag = crypto.randomUUID().slice(0, 8);

    const [category] = await db
      .insert(schema.categories)
      .values({ slug: `cat-${tag}`, name: 'Cat' })
      .returning();

    const [cheap] = await db
      .insert(schema.services)
      .values({ categoryId: category!.id, slug: `cheap-${tag}`, name: 'Cheap' })
      .returning();
    const [pricey] = await db
      .insert(schema.services)
      .values({ categoryId: category!.id, slug: `pricey-${tag}`, name: 'Pricey' })
      .returning();
    const [unpriced] = await db
      .insert(schema.services)
      .values({ categoryId: category!.id, slug: `unpriced-${tag}`, name: 'Unpriced' })
      .returning();

    await db.insert(schema.servicePrices).values([
      { serviceId: cheap!.id, comboKey: '1', price: 900 },
      { serviceId: cheap!.id, comboKey: '2', price: 700 },
      { serviceId: cheap!.id, comboKey: '3', price: 1100 },
      { serviceId: pricey!.id, comboKey: '1', price: 5000 },
    ]);

    await db.insert(schema.variableGroups).values([
      { serviceId: cheap!.id, name: 'Size' },
      { serviceId: cheap!.id, name: 'Type' },
      { serviceId: pricey!.id, name: 'Size' },
    ]);

    const rows = await db
      .select({
        slug: schema.services.slug,
        min: minServicePrice,
        count: servicePriceCount,
        groups: variableGroupCount,
      })
      .from(schema.services)
      .where(eq(schema.services.categoryId, category!.id));

    const bySlug = new Map(rows.map((r) => [r.slug, r]));

    expect(bySlug.get(`cheap-${tag}`)).toMatchObject({ min: 700, count: 3, groups: 2 });
    expect(bySlug.get(`pricey-${tag}`)).toMatchObject({ min: 5000, count: 1, groups: 1 });
    // An unpriced service must report NULL, not 0 — 0 would render as "৳0".
    expect(bySlug.get(`unpriced-${tag}`)?.min).toBeNull();
    expect(Number(bySlug.get(`unpriced-${tag}`)?.count)).toBe(0);
  });
});
