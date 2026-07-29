import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { getDb, schema } from '../src/index';
import { applicableCredit, getCreditBalance } from '../src/credit';

describe('applicableCredit', () => {
  it('caps at the requested amount when everything is plentiful', () => {
    expect(applicableCredit(1000, 2000, 300)).toBe(300);
  });

  it('caps at the balance', () => {
    expect(applicableCredit(200, 2000, 500)).toBe(200);
  });

  it('caps at the order total, so the total never goes negative', () => {
    expect(applicableCredit(5000, 1200, 5000)).toBe(1200);
  });

  it('returns zero for a negative or zero request', () => {
    expect(applicableCredit(1000, 2000, -50)).toBe(0);
    expect(applicableCredit(1000, 2000, 0)).toBe(0);
  });

  it('returns zero when the balance is negative', () => {
    expect(applicableCredit(-100, 2000, 300)).toBe(0);
  });
});

describe('getCreditBalance', () => {
  it('sums the ledger for one user only', async () => {
    const db = getDb(env.DB);
    const user = `user_${crypto.randomUUID()}`;
    const other = `user_${crypto.randomUUID()}`;

    await db.insert(schema.creditLedger).values([
      { userId: user, delta: 200, reason: 'REFERRAL_REWARD' },
      { userId: user, delta: 200, reason: 'REFERRAL_REWARD' },
      { userId: user, delta: -150, reason: 'ORDER_DISCOUNT' },
      { userId: other, delta: 999, reason: 'REFERRAL_REWARD' },
    ]);

    await expect(getCreditBalance(db, user)).resolves.toBe(250);
  });

  it('returns zero for a user with no ledger rows', async () => {
    const db = getDb(env.DB);
    await expect(getCreditBalance(db, `user_${crypto.randomUUID()}`)).resolves.toBe(0);
  });
});
