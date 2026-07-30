import { defineConfig } from 'drizzle-kit';

/**
 * The audit log is a SEPARATE D1 database, so it needs its own migration
 * history. Pointed at one schema file, not `schema/index.ts` — if the audit
 * table were in the main barrel, `drizzle-kit generate` would try to create it
 * in the application database and the separation would exist in name only.
 */
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/schema/audit.ts',
  out: './migrations-audit',
});
