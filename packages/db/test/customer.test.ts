import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { getDb, schema } from '../src/index';

/** Profiles are keyed by a real Better Auth user, so tests must create one. */
async function makeUser(db: ReturnType<typeof getDb>) {
  const id = `user_${crypto.randomUUID()}`;
  await db
    .insert(schema.user)
    .values({ id, name: 'Test Customer', email: `${id}@example.com` });
  return id;
}

describe('customer schema', () => {
  it('stores a profile pointing at a serviceable area', async () => {
    const db = getDb(env.DB);
    const userId = await makeUser(db);

    const [area] = await db
      .insert(schema.areas)
      .values({ name: `Dhanmondi ${crypto.randomUUID().slice(0, 6)}`, sort: 1 })
      .returning();

    await db.insert(schema.profiles).values({
      userId,
      fullName: 'Rafiq Hasan',
      phone: '+8801711000000',
      address: 'House 12, Road 4, Dhanmondi',
      areaId: area!.id,
      referralCode: `RAFIQ${crypto.randomUUID().slice(0, 6)}`,
    });

    const stored = await db.query.profiles.findFirst({
      where: (p, { eq }) => eq(p.userId, userId),
    });
    expect(stored?.fullName).toBe('Rafiq Hasan');
    expect(stored?.areaId).toBe(area!.id);
  });

  it('rejects a duplicate referral code', async () => {
    const db = getDb(env.DB);
    const first = await makeUser(db);
    const second = await makeUser(db);
    const code = `DUP${crypto.randomUUID().slice(0, 6)}`;

    await db
      .insert(schema.profiles)
      .values({ userId: first, fullName: 'A', phone: '1', address: 'x', referralCode: code });

    await expect(
      db
        .insert(schema.profiles)
        .values({ userId: second, fullName: 'B', phone: '2', address: 'y', referralCode: code }),
    ).rejects.toThrow();
  });
});
