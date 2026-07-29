# Provisioning Cloudflare resources

These commands need a Cloudflare account and an interactive login. Run them
yourself — they create billable resources and cannot be run unattended.

## 1. Authenticate

```bash
npx wrangler login
```

## 2. Create the D1 database

```bash
npx wrangler d1 create solvex-db
```

Copy the printed `database_id` into `packages/db/wrangler.jsonc`, replacing
`local-placeholder`. The same id is used by both apps' `wrangler.jsonc` in
later phases.

## 3. Create the R2 bucket

```bash
npx wrangler r2 bucket create solvex-assets
```

Attach a public custom domain (for example `cdn.solvex.com.bd`) in the
Cloudflare dashboard under R2 > solvex-assets > Settings > Public access.
Images are public marketing assets; no signed URLs are used.

## 4. Apply migrations and seed

Local:

```bash
npm --workspace @solvex/db run db:migrate:local
```

```bash
npm --workspace @solvex/db run db:seed:local
```

Remote:

```bash
npm --workspace @solvex/db run db:migrate:remote
```

```bash
npm --workspace @solvex/db run db:seed:remote
```

The seed is idempotent — re-running it will not duplicate rows.

## Secrets

Never commit secrets. Local values go in a gitignored `.dev.vars`; deployed
values go in via `wrangler secret put <NAME>`.
