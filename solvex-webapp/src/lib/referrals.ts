import { desc, eq, sql } from 'drizzle-orm';
import { schema } from '@solvex/db';
import { db } from './cf';

export type ReferralSummary = {
  invited: number;
  rewarded: number;
  earned: number;
  balance: number;
};

export type ReferralRow = {
  refereeName: string | null;
  status: string;
  createdAt: Date;
};

/**
 * What a customer sees about their own referrals.
 *
 * Deliberately narrow: aggregates plus a first name. A referrer must not be able
 * to read a referee's phone number, address, or what they booked just because
 * they shared a code with them.
 */
export async function getReferralSummary(userId: string): Promise<ReferralSummary> {
  const d = db();

  const [counts] = await d
    .select({
      invited: sql<number>`count(*)`,
      rewarded: sql<number>`sum(case when referrals.status = 'REWARDED' then 1 else 0 end)`,
    })
    .from(schema.referrals)
    .where(eq(schema.referrals.referrerUserId, userId));

  const [rewards] = await d
    .select({ total: sql<number>`coalesce(sum(credit_ledger.delta), 0)` })
    .from(schema.creditLedger)
    .where(
      sql`credit_ledger.user_id = ${userId} AND credit_ledger.reason = 'REFERRAL_REWARD'`,
    );

  const [balance] = await d
    .select({ total: sql<number>`coalesce(sum(credit_ledger.delta), 0)` })
    .from(schema.creditLedger)
    .where(eq(schema.creditLedger.userId, userId));

  return {
    invited: Number(counts?.invited ?? 0),
    rewarded: Number(counts?.rewarded ?? 0),
    earned: Number(rewards?.total ?? 0),
    balance: Number(balance?.total ?? 0),
  };
}

export async function listMyReferrals(userId: string): Promise<ReferralRow[]> {
  const rows = await db()
    .select({
      refereeName: sql<string | null>`(
        SELECT profiles.full_name FROM profiles WHERE profiles.user_id = referrals.referee_user_id
      )`,
      status: schema.referrals.status,
      createdAt: schema.referrals.createdAt,
    })
    .from(schema.referrals)
    .where(eq(schema.referrals.referrerUserId, userId))
    .orderBy(desc(schema.referrals.createdAt));

  return rows.map((r) => ({
    // First name only — enough to recognise who accepted.
    refereeName: r.refereeName ? (r.refereeName.split(' ')[0] ?? null) : null,
    status: r.status,
    createdAt: r.createdAt,
  }));
}
