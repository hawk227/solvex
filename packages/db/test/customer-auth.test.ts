import { env } from 'cloudflare:test';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { getDb, schema } from '../src/index';

async function makeUser(db: ReturnType<typeof getDb>, suffix = crypto.randomUUID()) {
  const id = `user_${suffix}`;
  await db.insert(schema.user).values({
    id,
    name: 'Rafiq Hasan',
    email: `rafiq-${suffix}@example.com`,
    emailVerified: true,
  });
  return id;
}

describe('customer auth tables', () => {
  it('keeps customer and admin identities in separate tables', async () => {
    const db = getDb(env.DB);
    const shared = crypto.randomUUID();
    const email = `same-${shared}@example.com`;

    await db
      .insert(schema.user)
      .values({ id: `u_${shared}`, name: 'Customer', email });
    await db
      .insert(schema.adminUser)
      .values({ id: `a_${shared}`, name: 'Admin', email });

    // The same address existing in both tables must not collide: they are
    // different identity spaces.
    const customers = await db.select().from(schema.user).where(eq(schema.user.email, email));
    const admins = await db
      .select()
      .from(schema.adminUser)
      .where(eq(schema.adminUser.email, email));

    expect(customers).toHaveLength(1);
    expect(admins).toHaveLength(1);
    expect(customers[0]!.id).not.toBe(admins[0]!.id);
  });

  it('rejects a profile for a user that does not exist', async () => {
    const db = getDb(env.DB);

    await expect(
      db.insert(schema.profiles).values({
        userId: 'user_does_not_exist',
        fullName: 'Ghost',
        phone: '+8801700000000',
        address: 'Nowhere',
        referralCode: `GHOST${crypto.randomUUID().slice(0, 6)}`,
      }),
    ).rejects.toThrow();
  });

  it('removes the profile when the account is deleted', async () => {
    const db = getDb(env.DB);
    const suffix = crypto.randomUUID().slice(0, 8);
    const userId = await makeUser(db, suffix);

    await db.insert(schema.profiles).values({
      userId,
      fullName: 'Rafiq Hasan',
      phone: '+8801711000000',
      address: 'House 12, Dhanmondi',
      referralCode: `RAFIQ${suffix}`,
    });

    await db.delete(schema.user).where(eq(schema.user.id, userId));

    const left = await db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, userId));
    expect(left).toHaveLength(0);
  });
});
