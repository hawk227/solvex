import { eq } from 'drizzle-orm';
import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { getDb, schema } from '../src/index';
import {
  synthesizeWalkInEmail,
  isWalkInEmail,
  findProfileByPhone,
  mergeWalkInIntoRealAccount,
} from '../src/walkin';

async function makeCustomer(
  db: ReturnType<typeof getDb>,
  opts: { phone: string; email: string; fullName?: string },
) {
  const tag = crypto.randomUUID().slice(0, 8);
  const userId = `user_${tag}`;
  await db.insert(schema.user).values({
    id: userId,
    name: opts.fullName ?? 'Customer',
    email: opts.email,
    emailVerified: !isWalkInEmail(opts.email),
  });
  await db.insert(schema.profiles).values({
    userId,
    fullName: opts.fullName ?? 'Customer',
    phone: opts.phone,
    address: 'Some address',
    referralCode: `REF${tag.toUpperCase()}`,
  });
  return userId;
}

describe('synthesizeWalkInEmail / isWalkInEmail', () => {
  it('round-trips: a synthesized email is recognised as a walk-in', () => {
    expect(isWalkInEmail(synthesizeWalkInEmail('+8801712345678'))).toBe(true);
  });

  it('is deterministic for the same phone', () => {
    expect(synthesizeWalkInEmail('+8801712345678')).toBe(synthesizeWalkInEmail('+8801712345678'));
  });

  it('does not treat a real email as a walk-in', () => {
    expect(isWalkInEmail('rafiq@example.com')).toBe(false);
  });
});

describe('findProfileByPhone', () => {
  it('finds a match and reports it is not a walk-in for a real email', async () => {
    const db = getDb(env.DB);
    const phone = '+8801711111111';
    const userId = await makeCustomer(db, { phone, email: `real-${crypto.randomUUID()}@example.com` });

    const found = await findProfileByPhone(db, phone);
    expect(found).toMatchObject({ userId, isWalkIn: false });
  });

  it('finds a match and reports it is a walk-in for the synthetic email', async () => {
    const db = getDb(env.DB);
    const phone = '+8801722222222';
    const userId = await makeCustomer(db, { phone, email: synthesizeWalkInEmail(phone) });

    const found = await findProfileByPhone(db, phone);
    expect(found).toMatchObject({ userId, isWalkIn: true });
  });

  it('returns null when no profile has that phone', async () => {
    const db = getDb(env.DB);
    expect(await findProfileByPhone(db, '+8801799999999')).toBeNull();
  });
});

describe('mergeWalkInIntoRealAccount', () => {
  it('moves orders and credit history onto the real account and removes the walk-in', async () => {
    const db = getDb(env.DB);
    const tag = crypto.randomUUID().slice(0, 8);
    const walkInPhone = '+8801733333333';
    const walkInUserId = await makeCustomer(db, { phone: walkInPhone, email: synthesizeWalkInEmail(walkInPhone) });
    const realUserId = await makeCustomer(db, {
      phone: '+8801744444444',
      email: `real-${crypto.randomUUID()}@example.com`,
    });

    const [category] = await db
      .insert(schema.categories)
      .values({ slug: `cat-${tag}`, name: 'Cat' })
      .returning();
    const [service] = await db
      .insert(schema.services)
      .values({ categoryId: category!.id, slug: `svc-${tag}`, name: 'Service' })
      .returning();
    const [slot] = await db
      .insert(schema.slotTemplates)
      .values({ label: `Slot ${tag}`, startTime: '09:00', endTime: '12:00' })
      .returning();

    await db.insert(schema.orders).values({
      code: `SX-${tag.toUpperCase()}`,
      userId: walkInUserId,
      serviceId: service!.id,
      comboKey: '',
      basePrice: 500,
      creditApplied: 0,
      total: 500,
      scheduledDate: '2026-10-15',
      slotId: slot!.id,
      nameSnapshot: 'Walk In',
      phoneSnapshot: walkInPhone,
      addressSnapshot: 'Some address',
      status: 'PENDING',
    });
    await db.insert(schema.creditLedger).values({ userId: walkInUserId, delta: 100, reason: 'ADMIN_ADJUSTMENT' });

    const result = await mergeWalkInIntoRealAccount(db, { walkInUserId, realUserId });
    expect(result).toEqual({ ordersMoved: 1, creditRowsMoved: 1 });

    const [order] = await db.select().from(schema.orders).where(eq(schema.orders.userId, realUserId));
    expect(order).toBeDefined();

    const [credit] = await db.select().from(schema.creditLedger).where(eq(schema.creditLedger.userId, realUserId));
    expect(credit).toBeDefined();

    const [walkInUser] = await db.select().from(schema.user).where(eq(schema.user.id, walkInUserId));
    expect(walkInUser).toBeUndefined();

    const [walkInProfile] = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, walkInUserId));
    expect(walkInProfile).toBeUndefined();
  });

  it('is a safe no-op when the walk-in has no orders or credit', async () => {
    const db = getDb(env.DB);
    const walkInPhone = '+8801755555555';
    const walkInUserId = await makeCustomer(db, { phone: walkInPhone, email: synthesizeWalkInEmail(walkInPhone) });
    const realUserId = await makeCustomer(db, {
      phone: '+8801766666666',
      email: `real-${crypto.randomUUID()}@example.com`,
    });

    const result = await mergeWalkInIntoRealAccount(db, { walkInUserId, realUserId });
    expect(result).toEqual({ ordersMoved: 0, creditRowsMoved: 0 });

    const [walkInUser] = await db.select().from(schema.user).where(eq(schema.user.id, walkInUserId));
    expect(walkInUser).toBeUndefined();
  });
});
