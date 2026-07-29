import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { getDb, schema } from '../src/index';

describe('referral schema', () => {
  it('links a referrer to a referee and records credit', async () => {
    const db = getDb(env.DB);

    await db
      .insert(schema.referrals)
      .values({ referrerUserId: 'user_a', refereeUserId: 'user_b', status: 'PENDING' });

    await db.insert(schema.creditLedger).values([
      { userId: 'user_a', delta: 200, reason: 'REFERRAL_REWARD' },
      { userId: 'user_a', delta: -150, reason: 'ORDER_DISCOUNT' },
    ]);

    const rows = await db.select().from(schema.creditLedger);
    expect(rows.reduce((sum, r) => sum + r.delta, 0)).toBe(50);
  });

  it('allows a customer to be referred only once', async () => {
    const db = getDb(env.DB);

    await db
      .insert(schema.referrals)
      .values({ referrerUserId: 'user_x', refereeUserId: 'user_once', status: 'PENDING' });

    await expect(
      db
        .insert(schema.referrals)
        .values({ referrerUserId: 'user_y', refereeUserId: 'user_once', status: 'PENDING' }),
    ).rejects.toThrow();
  });
});
