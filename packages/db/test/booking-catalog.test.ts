import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { getDb, schema } from '../src/index';
import { getBookingCatalog } from '../src/booking-catalog';

async function fixture(db: ReturnType<typeof getDb>, tag: string, opts: { categoryActive?: boolean; serviceActive?: boolean } = {}) {
  const [category] = await db
    .insert(schema.categories)
    .values({ slug: `cat-${tag}`, name: `Category ${tag}`, active: opts.categoryActive ?? true })
    .returning();
  const [service] = await db
    .insert(schema.services)
    .values({
      categoryId: category!.id,
      slug: `svc-${tag}`,
      name: `Service ${tag}`,
      active: opts.serviceActive ?? true,
    })
    .returning();
  return { category: category!, service: service! };
}

describe('getBookingCatalog', () => {
  it('excludes an inactive service from services, groups, and prices', async () => {
    const db = getDb(env.DB);
    const tag = crypto.randomUUID().slice(0, 8);
    const { service } = await fixture(db, tag, { serviceActive: false });

    const [group] = await db
      .insert(schema.variableGroups)
      .values({ serviceId: service.id, name: 'Size' })
      .returning();
    await db.insert(schema.variableOptions).values({ groupId: group!.id, label: 'Small' });
    await db.insert(schema.servicePrices).values({ serviceId: service.id, comboKey: '', price: 100 });

    const catalog = await getBookingCatalog(db);

    expect(catalog.services.find((s) => s.id === service.id)).toBeUndefined();
    expect(catalog.groups.find((g) => g.serviceId === service.id)).toBeUndefined();
    expect(catalog.prices.find((p) => p.serviceId === service.id)).toBeUndefined();
  });

  it('excludes a service whose category is inactive, even though the service itself is active', async () => {
    const db = getDb(env.DB);
    const tag = crypto.randomUUID().slice(0, 8);
    const { service } = await fixture(db, tag, { categoryActive: false, serviceActive: true });

    await db.insert(schema.servicePrices).values({ serviceId: service.id, comboKey: '', price: 100 });

    const catalog = await getBookingCatalog(db);

    expect(catalog.services.find((s) => s.id === service.id)).toBeUndefined();
    expect(catalog.prices.find((p) => p.serviceId === service.id)).toBeUndefined();
  });

  it('attaches variable groups and options to the right service, in sort order, without leaking across services', async () => {
    const db = getDb(env.DB);
    const tag = crypto.randomUUID().slice(0, 8);
    const { service: serviceA } = await fixture(db, `${tag}-a`);
    const { service: serviceB } = await fixture(db, `${tag}-b`);

    const [groupA] = await db
      .insert(schema.variableGroups)
      .values({ serviceId: serviceA.id, name: 'Size', sort: 1 })
      .returning();
    const [groupA2] = await db
      .insert(schema.variableGroups)
      .values({ serviceId: serviceA.id, name: 'Colour', sort: 0 })
      .returning();
    const [groupB] = await db
      .insert(schema.variableGroups)
      .values({ serviceId: serviceB.id, name: 'Material' })
      .returning();

    await db.insert(schema.variableOptions).values([
      { groupId: groupA!.id, label: 'Large', sort: 1 },
      { groupId: groupA!.id, label: 'Small', sort: 0 },
    ]);
    await db.insert(schema.variableOptions).values({ groupId: groupB!.id, label: 'Wood' });

    const catalog = await getBookingCatalog(db);

    const groupsA = catalog.groups.filter((g) => g.serviceId === serviceA.id);
    expect(groupsA.map((g) => g.name)).toEqual(['Colour', 'Size']);

    const sizeGroup = groupsA.find((g) => g.id === groupA!.id)!;
    expect(sizeGroup.options.map((o) => o.label)).toEqual(['Small', 'Large']);

    const groupsB = catalog.groups.filter((g) => g.serviceId === serviceB.id);
    expect(groupsB).toHaveLength(1);
    expect(groupsB[0]!.options.map((o) => o.label)).toEqual(['Wood']);

    // Options for service A's groups must never show up under service B's group.
    const groupBEntry = catalog.groups.find((g) => g.id === groupB!.id)!;
    expect(groupBEntry.options.map((o) => o.label)).not.toContain('Small');
  });

  it('scopes prices per service — a comboKey for one service is not attached to another', async () => {
    const db = getDb(env.DB);
    const tag = crypto.randomUUID().slice(0, 8);
    const { service: serviceA } = await fixture(db, `${tag}-a`);
    const { service: serviceB } = await fixture(db, `${tag}-b`);

    await db.insert(schema.servicePrices).values([
      { serviceId: serviceA.id, comboKey: '1-2', price: 500 },
      { serviceId: serviceB.id, comboKey: '1-2', price: 900 },
    ]);

    const catalog = await getBookingCatalog(db);

    const priceA = catalog.prices.find((p) => p.serviceId === serviceA.id && p.comboKey === '1-2');
    const priceB = catalog.prices.find((p) => p.serviceId === serviceB.id && p.comboKey === '1-2');

    expect(priceA?.price).toBe(500);
    expect(priceB?.price).toBe(900);
  });
});
