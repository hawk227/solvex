import { applyD1Migrations, env } from 'cloudflare:test';

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
// The audit log is a separate database with its own lineage.
await applyD1Migrations(env.AUDIT_DB, env.TEST_AUDIT_MIGRATIONS);
