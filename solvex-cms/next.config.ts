import type { NextConfig } from 'next';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

const nextConfig: NextConfig = {};

// Makes Cloudflare bindings (D1, R2) available during `next dev`.
initOpenNextCloudflareForDev();

export default nextConfig;
