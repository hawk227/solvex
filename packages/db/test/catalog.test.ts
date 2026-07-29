import { env } from 'cloudflare:test';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { getDb, schema } from '../src/index';

describe('catalog schema', () => {
  it('stores a category with a service and its priced variable combination', async () => {
    const db = getDb(env.DB);

    const [category] = await db
      .insert(schema.categories)
      .values({ slug: 'ac', name: 'Air Conditioner', sort: 1 })
      .returning();
    expect(category).toBeDefined();

    const [service] = await db
      .insert(schema.services)
      .values({
        categoryId: category!.id,
        slug: 'ac-cleaning',
        name: 'AC Cleaning',
        shortDesc: 'Full indoor and outdoor unit cleaning',
        durationMin: 60,
        aboutMd: 'We clean the filters, coils, and drain line.',
        includedJson: ['Filter cleaning', 'Coil wash'],
        notIncludedJson: ['Gas refill'],
        faqsJson: [{ q: 'How long does it take?', a: 'About an hour.' }],
      })
      .returning();
    expect(service).toBeDefined();

    const [group] = await db
      .insert(schema.variableGroups)
      .values({ serviceId: service!.id, name: 'AC Size', sort: 1 })
      .returning();

    const options = await db
      .insert(schema.variableOptions)
      .values([
        { groupId: group!.id, label: '1.5 Ton', sort: 1 },
        { groupId: group!.id, label: '2 Ton', sort: 2 },
      ])
      .returning();
    expect(options).toHaveLength(2);

    await db.insert(schema.servicePrices).values([
      { serviceId: service!.id, comboKey: String(options[0]!.id), price: 1500 },
      { serviceId: service!.id, comboKey: String(options[1]!.id), price: 1800 },
    ]);

    const prices = await db
      .select()
      .from(schema.servicePrices)
      .where(eq(schema.servicePrices.serviceId, service!.id));

    expect(prices.map((p) => p.price).sort()).toEqual([1500, 1800]);

    const stored = await db.query.services.findFirst({
      where: eq(schema.services.id, service!.id),
    });
    expect(stored?.includedJson).toEqual(['Filter cleaning', 'Coil wash']);
    expect(stored?.faqsJson).toEqual([{ q: 'How long does it take?', a: 'About an hour.' }]);
  });

  it('rejects two services sharing a slug', async () => {
    const db = getDb(env.DB);
    const [category] = await db
      .insert(schema.categories)
      .values({ slug: 'fridge', name: 'Refrigerator', sort: 2 })
      .returning();

    await db
      .insert(schema.services)
      .values({ categoryId: category!.id, slug: 'fridge-repair', name: 'Fridge Repair' });

    await expect(
      db
        .insert(schema.services)
        .values({ categoryId: category!.id, slug: 'fridge-repair', name: 'Duplicate' }),
    ).rejects.toThrow();
  });
});
