# Deploying

```bash
npm --workspace solvex-webapp run deploy
npm --workspace solvex-cms run deploy
```

## Always use `npm run deploy`

`npm run deploy` is `opennextjs-cloudflare build && opennextjs-cloudflare deploy`.

Do **not** run `wrangler deploy` or `opennextjs-cloudflare deploy` on their own.
Those ship whatever is already sitting in `.open-next/`, which may predate your
source. It has silently deployed a stale bundle twice: once losing the entire
`/support` route, and once serving `workers.dev` URLs in the sitemap, canonical
tags and structured data after the domain had been switched to `solvex.ltd`.

`next build` does **not** produce a deployable Worker either — it only builds
`.next/`. `build:cf` is the step that turns that into `.open-next/`.

Both failures looked like success: the deploy command exited 0 and reported a
new version id. Verify against the live URL, not the exit code.

## After deploying

```bash
npm --workspace @solvex/db run db:status
```

Confirms both D1 databases have every local migration applied. Production sat
three migrations behind for days without a symptom.
