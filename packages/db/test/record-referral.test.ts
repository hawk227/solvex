import { env } from 'cloudflare:test';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { getDb, schema } from '../src/index';
import { recordReferral } from '../src/referral';

async function customer(db: ReturnType<typeof getDb>, code?: string) {
  const suffix = crypto.randomUUID().slice(0, 8);
  const id = `user_${suffix}`;
  await db
    .insert(schema.user)
    .values({ id, name: 'Customer', email: `${id}@example.com`, emailVerified: true });

  if (code) {
    await db.insert(schema.profiles).values({
      userId: id,
      fullName: 'Customer',
      phone: '+8801712345678',
      address: 'Somewhere in Dhaka',
      referralCode: code,
    });
  }
  return id;
}

describe('recordReferral', () => {
  it('links the code owner to the referee', async () => {
    const db = getDb(env.DB);
    const code = `CODE${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const referrer = await customer(db, code);
    const referee = await customer(db);

    const result = await recordReferral(db, code, referee);

    expect(result).toEqual({ ok: true, referrerUserId: referrer });

    const [row] = await db
      .select()
      .from(schema.referrals)
      .where(eq(schema.referrals.refereeUserId, referee));
    expect(row).toMatchObject({ referrerUserId: referrer, status: 'PENDING' });
  });

  it('accepts a code in any case, with surrounding whitespace', async () => {
    const db = getDb(env.DB);
    const code = `MIXED${crypto.randomUUID().slice(0, 5).toUpperCase()}`;
    await customer(db, code);
    const referee = await customer(db);

    const result = await recordReferral(db, `  ${code.toLowerCase()}  `, referee);
    expect(result.ok).toBe(true);
  });

  it('rejects an unknown code', async () => {
    const db = getDb(env.DB);
    const referee = await customer(db);

    expect(await recordReferral(db, 'NOSUCHCODE', referee)).toEqual({
      ok: false,
      reason: 'unknown-code',
    });
    expect(await recordReferral(db, '   ', referee)).toEqual({
      ok: false,
      reason: 'unknown-code',
    });
  });

  it('rejects self-referral', async () => {
    const db = getDb(env.DB);
    const code = `SELF${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const referrer = await customer(db, code);

    expect(await recordReferral(db, code, referrer)).toEqual({
      ok: false,
      reason: 'self-referral',
    });

    const rows = await db
      .select()
      .from(schema.referrals)
      .where(eq(schema.referrals.refereeUserId, referrer));
    expect(rows).toHaveLength(0);
  });

  it('refuses to referee the same customer twice', async () => {
    const db = getDb(env.DB);
    const codeA = `AAA${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    const codeB = `BBB${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    await customer(db, codeA);
    await customer(db, codeB);
    const referee = await customer(db);

    expect((await recordReferral(db, codeA, referee)).ok).toBe(true);
    expect(await recordReferral(db, codeB, referee)).toEqual({
      ok: false,
      reason: 'already-referred',
    });

    const rows = await db
      .select()
      .from(schema.referrals)
      .where(eq(schema.referrals.refereeUserId, referee));
    expect(rows).toHaveLength(1);
  });

  it('lets exactly one of two concurrent attributions win', async () => {
    const db = getDb(env.DB);
    const codeA = `RACEA${crypto.randomUUID().slice(0, 5).toUpperCase()}`;
    const codeB = `RACEB${crypto.randomUUID().slice(0, 5).toUpperCase()}`;
    await customer(db, codeA);
    await customer(db, codeB);
    const referee = await customer(db);

    const results = await Promise.all([
      recordReferral(db, codeA, referee),
      recordReferral(db, codeB, referee),
    ]);

    expect(results.filter((r) => r.ok)).toHaveLength(1);

    const rows = await db
      .select()
      .from(schema.referrals)
      .where(eq(schema.referrals.refereeUserId, referee));
    expect(rows).toHaveLength(1);
  });
});
