# Provisioning Cloudflare resources

## Current state

| Resource | Status |
|---|---|
| Cloudflare account | `dillkhan33@gmail.com` — `a5701dfaac1e7ba93284163cd1ef3fa4` |
| D1 `solvex-db` | **Done.** `6ed04555-bec5-422c-a77d-c1c649159678`, region APAC. Migrated and seeded. |
| R2 `solvex-assets` | **Done.** Public reads at `https://pub-8eb424560a9d48c8a3c365d020301024.r2.dev` (r2.dev — development only, see step 3). |
| Remote migrations | **Done.** Applied through `0008`. |

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

Already done. For reference:

```bash
npx wrangler r2 bucket create solvex-assets
npx wrangler r2 bucket dev-url enable solvex-assets
```

### The r2.dev URL is not for production

`CDN_BASE_URL` currently points at the managed `r2.dev` address. Cloudflare
rate-limits that endpoint and documents it as unsuitable for production traffic.

**Before launch**, attach a custom domain (R2 > solvex-assets > Settings >
Public access > Custom domain), e.g. `cdn.solvex.com.bd`, then update
`CDN_BASE_URL` in BOTH `solvex-cms/wrangler.jsonc` and
`solvex-webapp/wrangler.jsonc`. Existing image keys keep working — only the host
changes.

Note the whole bucket is publicly readable by design: it holds category and
service images for the public website. Never put customer data in it.

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

## 6. Email (Cloudflare Email Service)

Transactional email uses the **REST API**, not the Workers `send_email` binding —
the binding needs `cloudflare:email`, which OpenNext's bundler cannot resolve.

1. Cloudflare dashboard → **Compute → Email Service → Email Sending → Onboard
   Domain**. Cloudflare adds the MX, SPF, DKIM and DMARC records. The domain must
   already use Cloudflare DNS.
2. Create an API token with **Email Sending: Edit**.
3. Set both secrets on the webapp:

```bash
npx wrangler secret put CF_ACCOUNT_ID
npx wrangler secret put CF_EMAIL_API_TOKEN
```

With these unset, local dev logs the email to the console instead of sending, so
signup is testable. In production a missing credential **throws** — silently
dropping a verification code would break signup invisibly.

**Before Phase 3 goes live, verify inbox placement to a real Gmail and Outlook
address.** OTP mail landing in spam kills signup with no error on our side.

## Required secrets (updated)

| Name | App | Purpose |
|---|---|---|
| `BETTER_AUTH_SECRET` | both | Signs session cookies. 32+ random bytes. Different value per app. |
| `BETTER_AUTH_URL` | both | Public origin. |
| `SETUP_TOKEN` | CMS, temporary | Guards the one-shot first-admin route. Remove after use. |
| `CF_ACCOUNT_ID` | webapp | Cloudflare account for the email REST API. |
| `CF_EMAIL_API_TOKEN` | webapp | Token with Email Sending: Edit. |

Note: these are read from the **Cloudflare env**, not `process.env`. Better Auth
defaults to `process.env`, so the secret and base URL are passed to it explicitly
in each app's `src/lib/auth.ts`.
