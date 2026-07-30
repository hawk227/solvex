import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getDb, type Db } from '@solvex/db';

/**
 * Cloudflare bindings for the CMS Worker. Declared here rather than generated
 * so the shape stays reviewable; keep in sync with wrangler.jsonc.
 */
export type CmsEnv = {
  DB: D1Database;
  ASSETS_BUCKET: R2Bucket;
  CDN_BASE_URL: string;
  NEXTJS_ENV?: string;
};

function env(): CmsEnv {
  return getCloudflareContext().env as unknown as CmsEnv;
}

/** Drizzle client bound to the shared D1 database. */
export function db(): Db {
  return getDb(env().DB);
}

/** R2 bucket holding category and service images. */
export function bucket(): R2Bucket {
  return env().ASSETS_BUCKET;
}

/** Public base URL images are served from. */
export function cdnBaseUrl(): string {
  return env().CDN_BASE_URL;
}

/**
 * Public URL for an R2 object key, or null when no image is set.
 *
 * Outside production this points at a local route that reads the binding
 * directly: uploads in development land in Miniflare's R2, which the real CDN
 * host knows nothing about, so every preview would appear broken.
 */
export function imageUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  if (env().NEXTJS_ENV !== 'production') {
    return `/api/image/${key.split('/').map(encodeURIComponent).join('/')}`;
  }
  return `${cdnBaseUrl().replace(/\/$/, '')}/${key}`;
}
