import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { getDb, schema } from '../src/index';

describe('scheduling schema', () => {
  it('stores slot templates and per-day capacity overrides', async () => {
    const db = getDb(env.DB);

    const slots = await db
      .insert(schema.slotTemplates)
      .values([
        { label: `9-12 ${crypto.randomUUID()}`, startTime: '09:00', endTime: '12:00', sort: 1 },
        { label: `12-3 ${crypto.randomUUID()}`, startTime: '12:00', endTime: '15:00', sort: 2 },
      ])
      .returning();

    expect(slots).toHaveLength(2);

    await db
      .insert(schema.slotCapacity)
      .values({ date: '2026-08-01', slotId: slots[0]!.id, capacity: 2 });

    const stored = await db.query.slotCapacity.findFirst();
    expect(stored).toMatchObject({ date: '2026-08-01', capacity: 2 });
  });

  it('rejects two overrides for the same date and slot', async () => {
    const db = getDb(env.DB);

    const [slot] = await db
      .insert(schema.slotTemplates)
      .values({ label: `3-6 ${crypto.randomUUID()}`, startTime: '15:00', endTime: '18:00', sort: 3 })
      .returning();

    await db
      .insert(schema.slotCapacity)
      .values({ date: '2026-08-02', slotId: slot!.id, capacity: 4 });

    await expect(
      db.insert(schema.slotCapacity).values({ date: '2026-08-02', slotId: slot!.id, capacity: 5 }),
    ).rejects.toThrow();
  });

  it('rejects two slot templates sharing a label', async () => {
    const db = getDb(env.DB);
    const label = `Evening ${crypto.randomUUID()}`;

    await db
      .insert(schema.slotTemplates)
      .values({ label, startTime: '18:00', endTime: '21:00' });

    await expect(
      db.insert(schema.slotTemplates).values({ label, startTime: '18:00', endTime: '21:00' }),
    ).rejects.toThrow();
  });
});
