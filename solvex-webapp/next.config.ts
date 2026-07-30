import type { NextConfig } from 'next';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

const nextConfig: NextConfig = {};

// Shared local binding state with the CMS and packages/db — see solvex-cms.
initOpenNextCloudflareForDev({ persist: { path: '../.wrangler/state/v3' } });

export default nextConfig;
