import { eq } from 'drizzle-orm';
import type { Db } from './index';
import { profiles } from './schema/customer';
import { referrals } from './schema/referral';
import { isUniqueViolation } from './errors';

export type ReferralOutcome =
  | { ok: true; referrerUserId: string }
  | { ok: false; reason: 'unknown-code' | 'self-referral' | 'already-referred' };

/**
 * Attribute a referral: link the customer who owns `code` to `refereeUserId`.
 *
 * Called only AFTER the referee's email is verified — an unverified signup must
 * not earn anyone credit. The reward itself is paid when the referee's first
 * order completes (Phase 5); this only records who referred whom.
 *
 * Rules enforced here:
 *  - an unknown code is rejected rather than silently ignored;
 *  - self-referral is rejected;
 *  - a customer can be referred at most once. That last one relies on the UNIQUE
 *    constraint on referee_user_id rather than a read-then-write check, which
 *    would race between two concurrent attempts.
 */
export async function recordReferral(
  db: Db,
  code: string,
  refereeUserId: string,
): Promise<ReferralOutcome> {
  const normalised = code.trim().toUpperCase();
  if (!normalised) return { ok: false, reason: 'unknown-code' };

  const [referrer] = await db
    .select({ userId: profiles.userId })
    .from(profiles)
    .where(eq(profiles.referralCode, normalised))
    .limit(1);

  if (!referrer) return { ok: false, reason: 'unknown-code' };
  if (referrer.userId === refereeUserId) return { ok: false, reason: 'self-referral' };

  try {
    await db.insert(referrals).values({
      referrerUserId: referrer.userId,
      refereeUserId,
      status: 'PENDING',
    });
  } catch (err) {
    if (isUniqueViolation(err, 'referrals.referee_user_id')) {
      return { ok: false, reason: 'already-referred' };
    }
    throw err;
  }

  return { ok: true, referrerUserId: referrer.userId };
}
