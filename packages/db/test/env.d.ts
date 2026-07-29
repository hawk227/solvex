import type { D1Migration } from '@cloudflare/vitest-pool-workers';

/**
 * `@cloudflare/vitest-pool-workers` 0.19 types `env` as `Cloudflare.Env`, so
 * test bindings are declared by augmenting that namespace.
 */
declare global {
  namespace Cloudflare {
    interface Env {
      DB: D1Database;
      TEST_MIGRATIONS: D1Migration[];
    }
  }
}

export {};
