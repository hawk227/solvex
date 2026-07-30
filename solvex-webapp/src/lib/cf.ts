import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getAuditDb, getDb, type AuditDb, type Db } from '@solvex/db';

/** Bindings for the public webapp. Read-only against the shared D1. */
export type WebEnv = {
  DB: D1Database;
  /** The audit log — a separate D1 database, deliberately. */
  AUDIT_DB: D1Database;
  CDN_BASE_URL: string;
};

function env(): WebEnv {
  return getCloudflareContext().env as unknown as WebEnv;
}

export function db(): Db {
  return getDb(env().DB);
}

/**
 * Drizzle client for the audit database.
 *
 * A different binding from `db()` above. The two are interchangeable to the
 * type system, so writing the log into the application database would raise no
 * error anywhere — hence the separate accessor rather than a parameter.
 */
export function auditDb(): AuditDb {
  return getAuditDb(env().AUDIT_DB);
}

/** Public URL for an R2 object key, or null when no image is set. */
export function imageUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  return `${env().CDN_BASE_URL.replace(/\/$/, '')}/${key}`;
}
