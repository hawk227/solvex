import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { getDb, schema } from '../src/index';
import { getGeography, isUnzoned } from '../src/geography';

const db = () => getDb(env.DB);

describe('getGeography', () => {
  it('returns zones, areas and locations, active only', async () => {
    const [zone] = await db()
      .insert(schema.zones)
      .values({ name: 'Central Dhaka', sort: 1 })
      .returning();
    await db().insert(schema.zones).values({ name: 'Retired zone', active: false });

    const [area] = await db()
      .insert(schema.areas)
      .values({ name: 'Motijheel', zoneId: zone!.id, sort: 1 })
      .returning();
    await db().insert(schema.areas).values({ name: 'Inactive area', zoneId: zone!.id, active: false });

    await db().insert(schema.locations).values({ name: 'Dilkusha', areaId: area!.id, sort: 1 });
    await db()
      .insert(schema.locations)
      .values({ name: 'Retired location', areaId: area!.id, active: false });

    const geo = await getGeography(db());

    expect(geo.zones.map((z) => z.name)).toContain('Central Dhaka');
    expect(geo.zones.map((z) => z.name)).not.toContain('Retired zone');

    expect(geo.areas.map((a) => a.name)).toContain('Motijheel');
    expect(geo.areas.map((a) => a.name)).not.toContain('Inactive area');

    expect(geo.locations.map((l) => l.name)).toContain('Dilkusha');
    expect(geo.locations.map((l) => l.name)).not.toContain('Retired location');

    // Cleanup for the next test in this file, since areas.name is unique.
    await db().delete(schema.locations);
    await db().delete(schema.areas);
    await db().delete(schema.zones);
  });

  it('reports an area with no zone as unzoned, not as an error', async () => {
    const [area] = await db()
      .insert(schema.areas)
      .values({ name: 'Dhanmondi', sort: 1 })
      .returning();

    const geo = await getGeography(db());
    const found = geo.areas.find((a) => a.id === area!.id);

    expect(found).toBeDefined();
    expect(found!.zoneId).toBeNull();
    expect(isUnzoned(found!)).toBe(true);

    await db().delete(schema.areas);
  });

  it('an area WITH a zone is not reported as unzoned', async () => {
    const [zone] = await db().insert(schema.zones).values({ name: 'Northern Dhaka' }).returning();
    const [area] = await db()
      .insert(schema.areas)
      .values({ name: 'Uttara', zoneId: zone!.id })
      .returning();

    const geo = await getGeography(db());
    const found = geo.areas.find((a) => a.id === area!.id)!;

    expect(isUnzoned(found)).toBe(false);

    await db().delete(schema.areas);
    await db().delete(schema.zones);
  });

  it('orders by sort, then by name', async () => {
    await db().insert(schema.zones).values([
      { name: 'Z Last', sort: 5 },
      { name: 'A First', sort: 1 },
    ]);

    const geo = await getGeography(db());
    const names = geo.zones.map((z) => z.name);
    expect(names.indexOf('A First')).toBeLessThan(names.indexOf('Z Last'));

    await db().delete(schema.zones);
  });
});
