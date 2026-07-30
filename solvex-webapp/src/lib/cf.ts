import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getDb, type Db } from '@solvex/db';

/** Bindings for the public webapp. Read-only against the shared D1. */
export type WebEnv = {
  DB: D1Database;
  CDN_BASE_URL: string;
};

function env(): WebEnv {
  return getCloudflareContext().env as unknown as WebEnv;
}

export function db(): Db {
  return getDb(env().DB);
}

/** Public URL for an R2 object key, or null when no image is set. */
export function imageUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  return `${env().CDN_BASE_URL.replace(/\/$/, '')}/${key}`;
}
