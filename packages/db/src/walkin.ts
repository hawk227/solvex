import { eq } from 'drizzle-orm';
import type { Db } from './index';
import { profiles } from './schema/customer';
import { user } from './schema/customer-auth';

export const WALKIN_EMAIL_DOMAIN = 'walkin.solvex.local';

/**
 * A deterministic placeholder identity for a phone-in customer with no
 * website account. Better Auth's `user.email` is NOT NULL UNIQUE, so a
 * walk-in still needs an address here — this one is never sent anything, and
 * the account has no `account`/`session` row, so nobody can sign in with it.
 * Deterministic in the phone so re-running "find or create" for the same
 * caller lands on the same customer instead of minting a new one each time.
 */
export function synthesizeWalkInEmail(normalizedPhone: string): string {
  return `${normalizedPhone.replace(/^\+/, '')}@${WALKIN_EMAIL_DOMAIN}`;
}

export function isWalkInEmail(email: string): boolean {
  return email.endsWith(`@${WALKIN_EMAIL_DOMAIN}`);
}

/**
 * Exact match on an already-normalized phone number. Used both to avoid
 * creating a duplicate walk-in for a repeat caller, and to detect a walk-in
 * worth merging when the same phone completes a real signup.
 */
export async function findProfileByPhone(
  db: Db,
  normalizedPhone: string,
): Promise<{ userId: string; fullName: string; isWalkIn: boolean } | null> {
  const [row] = await db
    .select({ userId: profiles.userId, fullName: profiles.fullName, email: user.email })
    .from(profiles)
    .innerJoin(user, eq(user.id, profiles.userId))
    .where(eq(profiles.phone, normalizedPhone))
    .limit(1);

  if (!row) return null;
  return { userId: row.userId, fullName: row.fullName, isWalkIn: isWalkInEmail(row.email) };
}
