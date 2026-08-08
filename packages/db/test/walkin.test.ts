import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { getDb, schema } from '../src/index';
import { synthesizeWalkInEmail, isWalkInEmail, findProfileByPhone } from '../src/walkin';

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
