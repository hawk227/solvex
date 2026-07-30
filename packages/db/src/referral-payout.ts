import { and, eq, sql } from 'drizzle-orm';
import type { Db } from './index';
import { orders } from './schema/orders';
import { referrals, creditLedger } from './schema/referral';
import { settings } from './schema/settings';

const REWARD_KEY = 'referral_reward_taka';

export type PayoutResult =
  | { paid: true; referrerUserId: string; amount: number }
  | { paid: false; reason: 'no-referral' | 'already-rewarded' | 'not-first-completion' | 'no-reward-configured' };

/**
 * Pay the referral reward for a completed order.
 *
 * Called when an order reaches COMPLETED. Three things must hold, and each is
 * enforced against the database rather than by an in-memory check:
 *
 *  1. the customer was referred and the referral is still PENDING;
 *  2. this is their FIRST completed order — a second completed order must not
 *     pay again;
 *  3. the reward fires exactly once even if two admins complete work
 *     simultaneously. The conditional UPDATE ... WHERE status = 'PENDING'
 *     RETURNING is what guarantees that: only one caller can win the row.
 *
 * Safe to call more than once for the same order; later calls report why they
 * did nothing instead of paying twice.
 */
export async function payReferralReward(db: Db, orderId: number): Promise<PayoutResult> {
  const [order] = await db
    .select({ userId: orders.userId, status: orders.status })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order || order.status !== 'COMPLETED') return { paid: false, reason: 'not-first-completion' };

  const [referral] = await db
    .select({ id: referrals.id, referrerUserId: referrals.referrerUserId, status: referrals.status })
    .from(referrals)
    .where(eq(referrals.refereeUserId, order.userId))
    .limit(1);

  if (!referral) return { paid: false, reason: 'no-referral' };
  if (referral.status !== 'PENDING') return { paid: false, reason: 'already-rewarded' };

  // Is this the customer's earliest completed order? Any earlier completion means
  // the reward window has passed.
  const [earlier] = await db
    .select({ n: sql<number>`count(*)` })
    .from(orders)
    .where(
      and(
        eq(orders.userId, order.userId),
        eq(orders.status, 'COMPLETED'),
        sql`${orders.id} < ${orderId}`,
      ),
    );

  if (Number(earlier?.n ?? 0) > 0) return { paid: false, reason: 'not-first-completion' };

  const [setting] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, REWARD_KEY))
    .limit(1);

  const amount = Number.parseInt(setting?.value ?? '', 10);
  if (!Number.isInteger(amount) || amount <= 0) {
    return { paid: false, reason: 'no-reward-configured' };
  }

  // Claim the referral. Only one concurrent caller can move it out of PENDING,
  // so the credit below is written at most once.
  const claimed = await db
    .update(referrals)
    .set({ status: 'REWARDED', orderId })
    .where(and(eq(referrals.id, referral.id), eq(referrals.status, 'PENDING')))
    .returning({ id: referrals.id });

  if (claimed.length === 0) return { paid: false, reason: 'already-rewarded' };

  await db.insert(creditLedger).values({
    userId: referral.referrerUserId,
    delta: amount,
    reason: 'REFERRAL_REWARD',
    orderId,
  });

  return { paid: true, referrerUserId: referral.referrerUserId, amount };
}
