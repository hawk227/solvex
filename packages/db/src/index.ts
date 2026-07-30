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
