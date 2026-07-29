import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { getDb, schema } from '../src/index';

describe('customer schema', () => {
  it('stores a profile pointing at a serviceable area', async () => {
    const db = getDb(env.DB);

    const [area] = await db
      .insert(schema.areas)
      .values({ name: 'Dhanmondi', sort: 1 })
      .returning();

    await db.insert(schema.profiles).values({
      userId: 'user_abc123',
      fullName: 'Rafiq Hasan',
      phone: '+8801711000000',
      address: 'House 12, Road 4, Dhanmondi',
      areaId: area!.id,
      referralCode: 'RAFIQ01',
    });

    const stored = await db.query.profiles.findFirst();
    expect(stored?.fullName).toBe('Rafiq Hasan');
    expect(stored?.areaId).toBe(area!.id);
  });

  it('rejects a duplicate referral code', async () => {
    const db = getDb(env.DB);

    await db
      .insert(schema.profiles)
      .values({ userId: 'user_1', fullName: 'A', phone: '1', address: 'x', referralCode: 'DUP1' });

    await expect(
      db
        .insert(schema.profiles)
        .values({ userId: 'user_2', fullName: 'B', phone: '2', address: 'y', referralCode: 'DUP1' }),
    ).rejects.toThrow();
  });
});
