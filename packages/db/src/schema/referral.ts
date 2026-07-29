import { relations } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { orders } from './orders';

export const REFERRAL_STATUSES = ['PENDING', 'REWARDED', 'VOID'] as const;
export type ReferralStatus = (typeof REFERRAL_STATUSES)[number];

export const CREDIT_REASONS = ['REFERRAL_REWARD', 'ORDER_DISCOUNT', 'ADMIN_ADJUSTMENT'] as const;
export type CreditReason = (typeof CREDIT_REASONS)[number];

/**
 * Referral attribution, created at signup. `refereeUserId` is UNIQUE: a
 * customer can be referred exactly once, which is what keeps the reward
 * payout idempotent.
 */
export const referrals = sqliteTable(
  'referrals',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    referrerUserId: text('referrer_user_id').notNull(),
    refereeUserId: text('referee_user_id').notNull().unique(),
    orderId: integer('order_id').references(() => orders.id, { onDelete: 'set null' }),
    status: text('status').notNull().$type<ReferralStatus>().default('PENDING'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index('referrals_referrer_idx').on(t.referrerUserId)],
);

/**
 * Append-only credit ledger, in integer BDT taka. Balance is
 * SUM(delta) WHERE user_id = ?. There is no cached balance column, so there
 * is nothing to drift.
 */
export const creditLedger = sqliteTable(
  'credit_ledger',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id').notNull(),
    delta: integer('delta').notNull(),
    reason: text('reason').notNull().$type<CreditReason>(),
    orderId: integer('order_id').references(() => orders.id, { onDelete: 'set null' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index('credit_ledger_user_idx').on(t.userId)],
);

export const referralsRelations = relations(referrals, ({ one }) => ({
  order: one(orders, { fields: [referrals.orderId], references: [orders.id] }),
}));

export const creditLedgerRelations = relations(creditLedger, ({ one }) => ({
  order: one(orders, { fields: [creditLedger.orderId], references: [orders.id] }),
}));
