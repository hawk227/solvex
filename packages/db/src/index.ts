import { drizzle } from 'drizzle-orm/d1';
import * as schemaTables from './schema/index';

export * as schema from './schema/index';

export function getDb(d1: D1Database) {
  return drizzle(d1, { schema: schemaTables });
}

export type Db = ReturnType<typeof getDb>;

export * from './pricing';
export * from './credit';
export * from './booking';
export * from "./slug";
export * from "./errors";
export * from "./content";
export * from "./aggregates";
export * from "./referral";
export * from "./place-order";

// Types and enums used across both apps. The `schema` namespace export above
// carries the tables; these are the accompanying value/type exports.
export { ORDER_STATUSES, type OrderStatus } from './schema/orders';
export { REFERRAL_STATUSES, type ReferralStatus, CREDIT_REASONS, type CreditReason } from './schema/referral';
export type { Faq } from './schema/catalog';
export * from "./referral-payout";
export * from "./analytics";
export * from "./technicians";
export * from "./permissions";
