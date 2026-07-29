# SolveX

Home-appliance service platform for Bangladesh. Customers book AC, fridge,
oven, and washer services; admins run operations from a back-office.

## Layout

| Path | What |
|---|---|
| `packages/db` | Drizzle schema, migrations, shared domain logic |
| `packages/tokens` | Shared CSS design tokens |
| `solvex-cms` | Admin back-office (Next.js on Workers) |
| `solvex-webapp` | Public site + customer booking (Next.js on Workers) |
| `docs/superpowers/specs` | Design specifications |
| `docs/superpowers/plans` | Implementation plans |

## Getting started

```bash
npm install
npm test
```

Design spec: `docs/superpowers/specs/2026-07-29-solvex-platform-design.md`
