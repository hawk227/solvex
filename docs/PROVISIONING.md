# Provisioning Cloudflare resources

## Current state

| Resource | Status |
|---|---|
| Cloudflare account | `dillkhan33@gmail.com` — `a5701dfaac1e7ba93284163cd1ef3fa4` |
| D1 `solvex-db` | **Done.** `6ed04555-bec5-422c-a77d-c1c649159678`, region APAC. Migrated and seeded. |
| R2 `solvex-assets` | **Blocked** — R2 must be enabled once in the dashboard. See step 3. |

## 1. Authenticate

```bash
npx wrangler login
```

## 2. Create the D1 database

Already done. For reference, or to recreate on another account:

```bash
npx wrangler d1 create solvex-db
```

Copy the printed `database_id` into `packages/db/wrangler.jsonc`. The same id
is used by both apps' `wrangler.jsonc` in later phases.

## 3. Create the R2 bucket

**Action needed from you.** R2 must be enabled once per account from the
Cloudflare dashboard (R2 > Overview) before any bucket can be created — this
requires adding a payment method, and the CLI cannot do it. R2 has a free tier;
enabling it does not by itself incur charges.

Once enabled:

```bash
npx wrangler r2 bucket create solvex-assets
```

Attach a public custom domain (for example `cdn.solvex.com.bd`) in the
Cloudflare dashboard under R2 > solvex-assets > Settings > Public access.
Images are public marketing assets; no signed URLs are used.

## 4. Apply migrations and seed

Remote is already migrated and seeded. Run the local pair after cloning:

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

## 5. Create the first admin

The CMS has no public signup. The first admin is created once through a
bootstrap route that refuses to run a second time.

Set a one-time token (local: add `SETUP_TOKEN` to `solvex-cms/.dev.vars`;
deployed: `npx wrangler secret put SETUP_TOKEN`), then:

```bash
curl -X POST https://<your-cms-host>/api/setup -H "content-type: application/json" -H "x-setup-token: $SETUP_TOKEN" -d '{"name":"Your Name","email":"you@example.com","password":"a-long-password"}'
```

The route refuses unless `admin_user` is empty, so it closes permanently after
the first admin exists. Remove the `SETUP_TOKEN` secret afterwards. Every
further admin is invited from inside the CMS.

## Required secrets

| Name | Where | Purpose |
|---|---|---|
| `BETTER_AUTH_SECRET` | both | Signs admin session cookies. 32+ random bytes. |
| `BETTER_AUTH_URL` | both | Public origin of the app. |
| `SETUP_TOKEN` | CMS, temporary | Guards the one-shot first-admin route. Remove after use. |
