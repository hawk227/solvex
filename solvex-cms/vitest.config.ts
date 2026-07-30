import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * Node-environment tests for pure logic only (validation, formatting).
 * Anything needing a Cloudflare binding belongs in packages/db, which runs
 * against a real local D1.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': path.join(import.meta.dirname, 'src') },
  },
});
