import type { NextConfig } from 'next';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

const nextConfig: NextConfig = {};

/*
 * Makes Cloudflare bindings (D1, R2) available during `next dev`.
 *
 * `persist.path` points at a single directory shared by every workspace so the
 * CMS, the webapp, and `packages/db` all read and write the SAME local D1.
 * Wrangler's default is `.wrangler/state/v3` relative to each config file,
 * which would silently give each app its own database and let migrations drift
 * apart.
 */
initOpenNextCloudflareForDev({ persist: { path: '../.wrangler/state/v3' } });

export default nextConfig;
