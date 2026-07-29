import { eq, sql } from 'drizzle-orm';
import type { Db } from './index';
import { creditLedger } from './schema/referral';

/** Balance in integer BDT taka. The ledger is the only source of truth. */
export async function getCreditBalance(db: Db, userId: string): Promise<number> {
  const row = await db
    .select({ balance: sql<number>`coalesce(sum(${creditLedger.delta}), 0)` })
    .from(creditLedger)
    .where(eq(creditLedger.userId, userId))
    .get();

  return row?.balance ?? 0;
}

/**
 * How much credit may actually be applied to an order, in integer BDT taka.
 * Capped at the balance and at the order total, so the payable total can never
 * go below zero and credit can never be conjured from an overdrawn account.
 */
export function applicableCredit(balance: number, basePrice: number, requested: number): number {
  if (requested <= 0 || balance <= 0 || basePrice <= 0) return 0;
  return Math.min(requested, balance, basePrice);
}
