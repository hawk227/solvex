import { defineCloudflareConfig } from '@opennextjs/cloudflare';

const config = defineCloudflareConfig();

/*
 * `cloudflare:email` is a runtime module provided by the Workers platform.
 * Wrangler resolves it, but OpenNext's esbuild bundling pass does not, and fails
 * with "Could not resolve". Marking it external leaves the import for the
 * runtime to satisfy.
 */
config.edgeExternals = [...(config.edgeExternals ?? []), 'cloudflare:email'];

export default config;
