import type { NextConfig } from 'next';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      /*
       * Image uploads travel through a server action, and the default cap is
       * 1 MB — well under the 5 MB the upload form advertises, so any real
       * phone photo failed with "Body exceeded 1 MB limit".
       *
       * 6 MB rather than 5: the limit applies to the raw request body, and
       * multipart adds boundaries and part headers on top of the file itself.
       */
      bodySizeLimit: '6mb',
    },
  },
};

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
