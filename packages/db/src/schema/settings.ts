import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Global key/value configuration. Values are stored as text and parsed by the
 * caller. Known keys:
 *   default_slot_capacity  integer, e.g. "6"
 *   referral_reward_taka   integer BDT, e.g. "200"
 */
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
