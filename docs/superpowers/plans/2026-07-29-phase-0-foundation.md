# Phase 0 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the SolveX workspace with a complete, migrated D1 schema and tested domain logic for pricing, credit, and slot capacity, so both apps can be built on top of it without further schema work.

**Architecture:** One npm-workspaces repository. `packages/db` owns the Drizzle schema, every migration, and the pure domain logic both apps share. `packages/tokens` owns the CSS variables both apps style against. Apps are added in later phases and import both packages. Tests run against a real local D1 through `@cloudflare/vitest-pool-workers`.

**Tech Stack:** TypeScript 5 (strict), Drizzle ORM 0.45.2, drizzle-kit 0.31.10, Cloudflare D1, Wrangler 4.115.0, Vitest 4.1.10, `@cloudflare/vitest-pool-workers` 0.19.0.

## Global Constraints

- Package manager is **npm**. Workspaces at the repo root. No Turborepo, no pnpm, no yarn.
- **Only `packages/db` defines tables or migrations.** Apps never declare a table.
- All money is **integer BDT taka**. No floats, no decimals, anywhere. A price of ৳1,500 is stored as `1500`.
- All timestamps are `integer({ mode: 'timestamp_ms' })`, defaulting to `CURRENT_TIMESTAMP` semantics via `$defaultFn(() => new Date())`.
- Timezone for all business-day logic is **Asia/Dhaka**. Dates on orders and capacity are stored as `TEXT` in `YYYY-MM-DD` form, already resolved to Dhaka local date — never as a timestamp.
- TypeScript `strict: true`. No `any` in committed code.
- Every task ends with a passing test run and a commit.
- Node 22+.
- Never commit secrets. Local secrets go in `.dev.vars` (gitignored); deployed secrets via `wrangler secret put`.

---

### Task 1: Workspace root

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `README.md`

**Interfaces:**
- Consumes: nothing
- Produces: npm workspaces resolving `packages/*` and `apps` directories; `tsconfig.base.json` extended by every package.

- [ ] **Step 1: Create the root `package.json`**

```json
{
  "name": "solvex",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22" },
  "workspaces": ["packages/*", "solvex-cms", "solvex-webapp"],
  "scripts": {
    "test": "npm run test --workspaces --if-present",
    "typecheck": "npm run typecheck --workspaces --if-present"
  },
  "devDependencies": {
    "typescript": "^5.9.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "verbatimModuleSyntax": true,
    "noEmit": true
  }
}
```

`noUncheckedIndexedAccess` is deliberate: array and record lookups in the pricing code must be null-checked rather than assumed.

- [ ] **Step 3: Create `README.md`**

```markdown
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
```

- [ ] **Step 4: Install and verify**

Run: `npm install && npx tsc --version`
Expected: install completes, prints `Version 5.9.x` or higher.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tsconfig.base.json README.md
git commit -m "chore: npm workspace root"
```

---

### Task 2: `packages/db` scaffold with a working migration and test pipeline

This task proves the whole chain end to end — schema file → generated migration → applied to a real local D1 → queried from a test — using one small table. Every later schema task reuses this pipeline.

**Files:**
- Create: `packages/db/package.json`
- Create: `packages/db/tsconfig.json`
- Create: `packages/db/drizzle.config.ts`
- Create: `packages/db/wrangler.jsonc`
- Create: `packages/db/vitest.config.ts`
- Create: `packages/db/test/env.d.ts`
- Create: `packages/db/src/schema/settings.ts`
- Create: `packages/db/src/schema/index.ts`
- Create: `packages/db/src/index.ts`
- Test: `packages/db/test/settings.test.ts`

**Interfaces:**
- Consumes: `tsconfig.base.json` from Task 1.
- Produces:
  - `@solvex/db` package exporting `schema` (all tables) and `getDb(d1: D1Database)`.
  - `settings` table: `{ key: string (PK), value: string }`.
  - The `npm run db:generate` script that every later schema task runs.

- [ ] **Step 1: Create `packages/db/package.json`**

```json
{
  "name": "@solvex/db",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./schema": "./src/schema/index.ts"
  },
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate:local": "wrangler d1 migrations apply solvex-db --local",
    "db:migrate:remote": "wrangler d1 migrations apply solvex-db --remote",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "drizzle-orm": "^0.45.2"
  },
  "devDependencies": {
    "@cloudflare/vitest-pool-workers": "^0.19.0",
    "@cloudflare/workers-types": "^4.20260101.0",
    "drizzle-kit": "^0.31.10",
    "vitest": "^4.1.10",
    "wrangler": "^4.115.0"
  }
}
```

- [ ] **Step 2: Create `packages/db/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "types": ["@cloudflare/workers-types"]
  },
  "include": ["src/**/*.ts", "test/**/*.ts", "*.ts"]
}
```

- [ ] **Step 3: Create `packages/db/drizzle.config.ts`**

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/schema/index.ts',
  out: './migrations',
});
```

Migrations land in `packages/db/migrations`, which is the directory Wrangler's
`d1 migrations apply` reads.

- [ ] **Step 4: Create `packages/db/wrangler.jsonc`**

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "solvex-db",
  "compatibility_date": "2026-07-01",
  "compatibility_flags": ["nodejs_compat"],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "solvex-db",
      "database_id": "local-placeholder",
      "migrations_dir": "migrations"
    }
  ]
}
```

`migrations_dir` belongs inside the D1 binding, not at the top level — Wrangler
warns and ignores it if placed at the top.

`database_id` is replaced with the real id in Task 12, once the remote database
is created. Local development and tests do not read it.

- [ ] **Step 5: Create `packages/db/vitest.config.ts`**

Note: `@cloudflare/vitest-pool-workers` 0.19 removed the `/config` subpath and
`defineWorkersConfig`. The current API is a Vite plugin, `cloudflareTest`,
exported from the package root.

```ts
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

const migrations = await readD1Migrations(path.join(import.meta.dirname, 'migrations'));

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
        bindings: { TEST_MIGRATIONS: migrations },
      },
    }),
  ],
  test: {
    setupFiles: ['./test/apply-migrations.ts'],
  },
});
```

- [ ] **Step 6: Create `packages/db/test/apply-migrations.ts`**

```ts
import { applyD1Migrations, env } from 'cloudflare:test';

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
```

This runs once per test worker, so every test file starts against a fully
migrated database.

- [ ] **Step 7: Create `packages/db/test/env.d.ts`**

0.19 types `env` as `Cloudflare.Env`, not `ProvidedEnv`, so bindings are
declared by augmenting that global namespace:

```ts
import type { D1Migration } from '@cloudflare/vitest-pool-workers';

declare global {
  namespace Cloudflare {
    interface Env {
      DB: D1Database;
      TEST_MIGRATIONS: D1Migration[];
    }
  }
}

export {};
```

`packages/db/tsconfig.json` must list all three type packages, or
`cloudflare:test` will not resolve under `tsc`:

```json
"types": ["node", "@cloudflare/workers-types", "@cloudflare/vitest-pool-workers/types"]
```

The `?raw` import in the seed test also needs `packages/db/src/sql.d.ts`:

```ts
declare module '*.sql?raw' {
  const content: string;
  export default content;
}
```

- [ ] **Step 8: Create `packages/db/src/schema/settings.ts`**

```ts
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Global key/value configuration. Values are stored as text and parsed by the
 * caller. Known keys:
 *   default_slot_capacity  integer, e.g. "6"
 *   referral_reward_taka   integer BDT, e.g. "200"
 */
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
```

- [ ] **Step 9: Create `packages/db/src/schema/index.ts`**

```ts
export * from './settings';
```

- [ ] **Step 10: Create `packages/db/src/index.ts`**

```ts
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema/index';

export * as schema from './schema/index';

export function getDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

export type Db = ReturnType<typeof getDb>;
```

- [ ] **Step 11: Install dependencies and generate the first migration**

Run:
```bash
npm install
npm --workspace @solvex/db run db:generate
```
Expected: a file appears at `packages/db/migrations/0000_*.sql` containing
`CREATE TABLE \`settings\``.

- [ ] **Step 12: Write the failing test**

Create `packages/db/test/settings.test.ts`:

```ts
import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { getDb, schema } from '../src/index';

describe('settings', () => {
  it('round-trips a key/value pair', async () => {
    const db = getDb(env.DB);

    await db.insert(schema.settings).values({ key: 'default_slot_capacity', value: '6' });

    const rows = await db.select().from(schema.settings);

    expect(rows).toEqual([{ key: 'default_slot_capacity', value: '6' }]);
  });
});
```

- [ ] **Step 13: Run the test**

Run: `npm --workspace @solvex/db test`
Expected: PASS. If it fails with "no such table: settings", the migration was
not generated in Step 11 — regenerate before continuing.

- [ ] **Step 14: Commit**

```bash
git add packages/db package.json package-lock.json
git commit -m "feat(db): drizzle + D1 + vitest pipeline with settings table"
```

---

### Task 3: Catalog schema

**Files:**
- Create: `packages/db/src/schema/catalog.ts`
- Modify: `packages/db/src/schema/index.ts`
- Test: `packages/db/test/catalog.test.ts`

**Interfaces:**
- Consumes: `getDb`, `schema` from Task 2.
- Produces tables `categories`, `services`, `variableGroups`, `variableOptions`, `servicePrices`. Column names used by later tasks: `servicePrices.serviceId`, `servicePrices.comboKey`, `servicePrices.price`; `variableOptions.groupId`; `variableGroups.serviceId`.

- [ ] **Step 1: Write the failing test**

Create `packages/db/test/catalog.test.ts`:

```ts
import { env } from 'cloudflare:test';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { getDb, schema } from '../src/index';

describe('catalog schema', () => {
  it('stores a category with a service and its priced variable combination', async () => {
    const db = getDb(env.DB);

    const [category] = await db
      .insert(schema.categories)
      .values({ slug: 'ac', name: 'Air Conditioner', sort: 1 })
      .returning();
    expect(category).toBeDefined();

    const [service] = await db
      .insert(schema.services)
      .values({
        categoryId: category!.id,
        slug: 'ac-cleaning',
        name: 'AC Cleaning',
        shortDesc: 'Full indoor and outdoor unit cleaning',
        durationMin: 60,
        aboutMd: 'We clean the filters, coils, and drain line.',
        includedJson: ['Filter cleaning', 'Coil wash'],
        notIncludedJson: ['Gas refill'],
        faqsJson: [{ q: 'How long does it take?', a: 'About an hour.' }],
      })
      .returning();
    expect(service).toBeDefined();

    const [group] = await db
      .insert(schema.variableGroups)
      .values({ serviceId: service!.id, name: 'AC Size', sort: 1 })
      .returning();

    const options = await db
      .insert(schema.variableOptions)
      .values([
        { groupId: group!.id, label: '1.5 Ton', sort: 1 },
        { groupId: group!.id, label: '2 Ton', sort: 2 },
      ])
      .returning();
    expect(options).toHaveLength(2);

    await db.insert(schema.servicePrices).values([
      { serviceId: service!.id, comboKey: String(options[0]!.id), price: 1500 },
      { serviceId: service!.id, comboKey: String(options[1]!.id), price: 1800 },
    ]);

    const prices = await db
      .select()
      .from(schema.servicePrices)
      .where(eq(schema.servicePrices.serviceId, service!.id));

    expect(prices.map((p) => p.price).sort()).toEqual([1500, 1800]);

    const stored = await db.query.services.findFirst({
      where: eq(schema.services.id, service!.id),
    });
    expect(stored?.includedJson).toEqual(['Filter cleaning', 'Coil wash']);
    expect(stored?.faqsJson).toEqual([{ q: 'How long does it take?', a: 'About an hour.' }]);
  });

  it('rejects two services sharing a slug', async () => {
    const db = getDb(env.DB);
    const [category] = await db
      .insert(schema.categories)
      .values({ slug: 'fridge', name: 'Refrigerator', sort: 2 })
      .returning();

    await db
      .insert(schema.services)
      .values({ categoryId: category!.id, slug: 'fridge-repair', name: 'Fridge Repair' });

    await expect(
      db
        .insert(schema.services)
        .values({ categoryId: category!.id, slug: 'fridge-repair', name: 'Duplicate' }),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm --workspace @solvex/db test`
Expected: FAIL — `schema.categories` is undefined.

- [ ] **Step 3: Create `packages/db/src/schema/catalog.ts`**

```ts
import { relations } from 'drizzle-orm';
import { index, integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';

export type Faq = { q: string; a: string };

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  imageKey: text('image_key'),
  sort: integer('sort').notNull().default(0),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const services = sqliteTable(
  'services',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    shortDesc: text('short_desc'),
    imageKey: text('image_key'),
    durationMin: integer('duration_min'),
    sort: integer('sort').notNull().default(0),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    aboutMd: text('about_md'),
    includedJson: text('included_json', { mode: 'json' }).$type<string[]>(),
    notIncludedJson: text('not_included_json', { mode: 'json' }).$type<string[]>(),
    faqsJson: text('faqs_json', { mode: 'json' }).$type<Faq[]>(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index('services_category_idx').on(t.categoryId)],
);

export const variableGroups = sqliteTable(
  'variable_groups',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    serviceId: integer('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    sort: integer('sort').notNull().default(0),
  },
  (t) => [index('variable_groups_service_idx').on(t.serviceId)],
);

export const variableOptions = sqliteTable(
  'variable_options',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    groupId: integer('group_id')
      .notNull()
      .references(() => variableGroups.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    sort: integer('sort').notNull().default(0),
  },
  (t) => [index('variable_options_group_idx').on(t.groupId)],
);

/**
 * One row per full combination of variable options for a service.
 * `comboKey` is the selected option ids sorted ascending and joined by "-";
 * a service with no variable groups uses the empty string.
 * `price` is integer BDT taka.
 */
export const servicePrices = sqliteTable(
  'service_prices',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    serviceId: integer('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    comboKey: text('combo_key').notNull(),
    price: integer('price').notNull(),
  },
  (t) => [unique('service_prices_combo_unq').on(t.serviceId, t.comboKey)],
);

export const categoriesRelations = relations(categories, ({ many }) => ({
  services: many(services),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  category: one(categories, { fields: [services.categoryId], references: [categories.id] }),
  variableGroups: many(variableGroups),
  prices: many(servicePrices),
}));

export const variableGroupsRelations = relations(variableGroups, ({ one, many }) => ({
  service: one(services, { fields: [variableGroups.serviceId], references: [services.id] }),
  options: many(variableOptions),
}));

export const variableOptionsRelations = relations(variableOptions, ({ one }) => ({
  group: one(variableGroups, {
    fields: [variableOptions.groupId],
    references: [variableGroups.id],
  }),
}));

export const servicePricesRelations = relations(servicePrices, ({ one }) => ({
  service: one(services, { fields: [servicePrices.serviceId], references: [services.id] }),
}));
```

- [ ] **Step 4: Export it from `packages/db/src/schema/index.ts`**

```ts
export * from './settings';
export * from './catalog';
```

- [ ] **Step 5: Generate and apply the migration**

Run:
```bash
npm --workspace @solvex/db run db:generate
```
Expected: a new `packages/db/migrations/0001_*.sql` creating the five tables.

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm --workspace @solvex/db test`
Expected: PASS, both cases.

- [ ] **Step 7: Commit**

```bash
git add packages/db
git commit -m "feat(db): catalog schema — categories, services, variables, prices"
```

---

### Task 4: Areas and customer profile schema

**Files:**
- Create: `packages/db/src/schema/customer.ts`
- Modify: `packages/db/src/schema/index.ts`
- Test: `packages/db/test/customer.test.ts`

**Interfaces:**
- Consumes: Task 2 pipeline.
- Produces tables `areas`, `profiles`. `profiles.userId` is `text` — it holds the Better Auth user id, which is a string. There is **no foreign key** to the Better Auth `user` table, because Better Auth generates that table in Phase 1; the constraint is added then.

- [ ] **Step 1: Write the failing test**

Create `packages/db/test/customer.test.ts`:

```ts
import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { getDb, schema } from '../src/index';

describe('customer schema', () => {
  it('stores a profile pointing at a serviceable area', async () => {
    const db = getDb(env.DB);

    const [area] = await db
      .insert(schema.areas)
      .values({ name: 'Dhanmondi', sort: 1 })
      .returning();

    await db.insert(schema.profiles).values({
      userId: 'user_abc123',
      fullName: 'Rafiq Hasan',
      phone: '+8801711000000',
      address: 'House 12, Road 4, Dhanmondi',
      areaId: area!.id,
      referralCode: 'RAFIQ01',
    });

    const stored = await db.query.profiles.findFirst();
    expect(stored?.fullName).toBe('Rafiq Hasan');
    expect(stored?.areaId).toBe(area!.id);
  });

  it('rejects a duplicate referral code', async () => {
    const db = getDb(env.DB);

    await db
      .insert(schema.profiles)
      .values({ userId: 'user_1', fullName: 'A', phone: '1', address: 'x', referralCode: 'DUP1' });

    await expect(
      db
        .insert(schema.profiles)
        .values({ userId: 'user_2', fullName: 'B', phone: '2', address: 'y', referralCode: 'DUP1' }),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm --workspace @solvex/db test -- customer`
Expected: FAIL — `schema.areas` is undefined.

- [ ] **Step 3: Create `packages/db/src/schema/customer.ts`**

```ts
import { relations } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/** Serviceable areas. Booking is restricted to active areas. */
export const areas = sqliteTable('areas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  sort: integer('sort').notNull().default(0),
});

/**
 * Customer profile. `userId` is the Better Auth user id (a string). The
 * foreign key to Better Auth's `user` table is added in Phase 1, once that
 * table exists.
 */
export const profiles = sqliteTable('profiles', {
  userId: text('user_id').primaryKey(),
  fullName: text('full_name').notNull(),
  phone: text('phone').notNull(),
  address: text('address').notNull(),
  areaId: integer('area_id').references(() => areas.id, { onDelete: 'set null' }),
  referralCode: text('referral_code').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const areasRelations = relations(areas, ({ many }) => ({
  profiles: many(profiles),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  area: one(areas, { fields: [profiles.areaId], references: [areas.id] }),
}));
```

- [ ] **Step 4: Export it from `packages/db/src/schema/index.ts`**

```ts
export * from './settings';
export * from './catalog';
export * from './customer';
```

- [ ] **Step 5: Generate the migration**

Run: `npm --workspace @solvex/db run db:generate`
Expected: a new migration creating `areas` and `profiles`.

- [ ] **Step 6: Run the tests**

Run: `npm --workspace @solvex/db test`
Expected: PASS, all files.

- [ ] **Step 7: Commit**

```bash
git add packages/db
git commit -m "feat(db): areas and customer profile schema"
```

---

### Task 5: Scheduling schema

**Files:**
- Create: `packages/db/src/schema/scheduling.ts`
- Modify: `packages/db/src/schema/index.ts`
- Test: `packages/db/test/scheduling.test.ts`

**Interfaces:**
- Consumes: Task 2 pipeline.
- Produces tables `slotTemplates`, `slotCapacity`. `slotCapacity` holds override rows only; an absent row means the `default_slot_capacity` setting applies. Its primary key is the composite `(date, slotId)`.

- [ ] **Step 1: Write the failing test**

Create `packages/db/test/scheduling.test.ts`:

```ts
import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { getDb, schema } from '../src/index';

describe('scheduling schema', () => {
  it('stores slot templates and per-day capacity overrides', async () => {
    const db = getDb(env.DB);

    const slots = await db
      .insert(schema.slotTemplates)
      .values([
        { label: '9:00 AM – 12:00 PM', startTime: '09:00', endTime: '12:00', sort: 1 },
        { label: '12:00 PM – 3:00 PM', startTime: '12:00', endTime: '15:00', sort: 2 },
      ])
      .returning();

    expect(slots).toHaveLength(2);

    await db
      .insert(schema.slotCapacity)
      .values({ date: '2026-08-01', slotId: slots[0]!.id, capacity: 2 });

    const stored = await db.query.slotCapacity.findFirst();
    expect(stored).toMatchObject({ date: '2026-08-01', capacity: 2 });
  });

  it('rejects two overrides for the same date and slot', async () => {
    const db = getDb(env.DB);

    const [slot] = await db
      .insert(schema.slotTemplates)
      .values({ label: '3:00 PM – 6:00 PM', startTime: '15:00', endTime: '18:00', sort: 3 })
      .returning();

    await db
      .insert(schema.slotCapacity)
      .values({ date: '2026-08-02', slotId: slot!.id, capacity: 4 });

    await expect(
      db.insert(schema.slotCapacity).values({ date: '2026-08-02', slotId: slot!.id, capacity: 5 }),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm --workspace @solvex/db test -- scheduling`
Expected: FAIL — `schema.slotTemplates` is undefined.

- [ ] **Step 3: Create `packages/db/src/schema/scheduling.ts`**

```ts
import { relations } from 'drizzle-orm';
import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/** Named booking windows. `startTime`/`endTime` are "HH:MM" in Asia/Dhaka. */
export const slotTemplates = sqliteTable('slot_templates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  label: text('label').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  sort: integer('sort').notNull().default(0),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
});

/**
 * Per-day capacity override. A missing row means the `default_slot_capacity`
 * setting applies, so days are never pre-generated.
 * `date` is "YYYY-MM-DD" already resolved to Asia/Dhaka local date.
 */
export const slotCapacity = sqliteTable(
  'slot_capacity',
  {
    date: text('date').notNull(),
    slotId: integer('slot_id')
      .notNull()
      .references(() => slotTemplates.id, { onDelete: 'cascade' }),
    capacity: integer('capacity').notNull(),
  },
  (t) => [primaryKey({ columns: [t.date, t.slotId] })],
);

export const slotTemplatesRelations = relations(slotTemplates, ({ many }) => ({
  overrides: many(slotCapacity),
}));

export const slotCapacityRelations = relations(slotCapacity, ({ one }) => ({
  slot: one(slotTemplates, { fields: [slotCapacity.slotId], references: [slotTemplates.id] }),
}));
```

- [ ] **Step 4: Export it from `packages/db/src/schema/index.ts`**

```ts
export * from './settings';
export * from './catalog';
export * from './customer';
export * from './scheduling';
```

- [ ] **Step 5: Generate the migration**

Run: `npm --workspace @solvex/db run db:generate`

- [ ] **Step 6: Run the tests**

Run: `npm --workspace @solvex/db test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/db
git commit -m "feat(db): slot templates and per-day capacity schema"
```

---

### Task 6: Orders and order events schema

**Files:**
- Create: `packages/db/src/schema/orders.ts`
- Modify: `packages/db/src/schema/index.ts`
- Test: `packages/db/test/orders.test.ts`

**Interfaces:**
- Consumes: Tasks 3, 4, 5 tables.
- Produces table `orders` and `orderEvents`, plus the exported constant `ORDER_STATUSES` and type `OrderStatus`, both used by every later phase.

- [ ] **Step 1: Write the failing test**

Create `packages/db/test/orders.test.ts`:

```ts
import { env } from 'cloudflare:test';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { getDb, schema } from '../src/index';
import { ORDER_STATUSES } from '../src/schema/orders';

async function seedService(db: ReturnType<typeof getDb>) {
  const [category] = await db
    .insert(schema.categories)
    .values({ slug: `cat-${crypto.randomUUID()}`, name: 'Cat' })
    .returning();
  const [service] = await db
    .insert(schema.services)
    .values({ categoryId: category!.id, slug: `svc-${crypto.randomUUID()}`, name: 'Svc' })
    .returning();
  const [slot] = await db
    .insert(schema.slotTemplates)
    .values({ label: 'Morning', startTime: '09:00', endTime: '12:00' })
    .returning();
  return { service: service!, slot: slot! };
}

describe('orders schema', () => {
  it('stores an order with snapshotted contact details and a status event', async () => {
    const db = getDb(env.DB);
    const { service, slot } = await seedService(db);

    const [order] = await db
      .insert(schema.orders)
      .values({
        code: 'SX-000001',
        userId: 'user_abc',
        serviceId: service.id,
        comboKey: '',
        basePrice: 1500,
        creditApplied: 0,
        total: 1500,
        scheduledDate: '2026-08-05',
        slotId: slot.id,
        nameSnapshot: 'Rafiq Hasan',
        phoneSnapshot: '+8801711000000',
        addressSnapshot: 'House 12, Road 4, Dhanmondi',
        status: 'PENDING',
      })
      .returning();

    await db
      .insert(schema.orderEvents)
      .values({ orderId: order!.id, status: 'PENDING', note: 'Order placed' });

    const events = await db
      .select()
      .from(schema.orderEvents)
      .where(eq(schema.orderEvents.orderId, order!.id));

    expect(events).toHaveLength(1);
    expect(events[0]!.status).toBe('PENDING');
    expect(order!.total).toBe(1500);
  });

  it('rejects a duplicate order code', async () => {
    const db = getDb(env.DB);
    const { service, slot } = await seedService(db);

    const base = {
      userId: 'user_abc',
      serviceId: service.id,
      comboKey: '',
      basePrice: 1000,
      creditApplied: 0,
      total: 1000,
      scheduledDate: '2026-08-06',
      slotId: slot.id,
      nameSnapshot: 'A',
      phoneSnapshot: '1',
      addressSnapshot: 'x',
      status: 'PENDING' as const,
    };

    await db.insert(schema.orders).values({ ...base, code: 'SX-000002' });
    await expect(db.insert(schema.orders).values({ ...base, code: 'SX-000002' })).rejects.toThrow();
  });

  it('exposes the full status list', () => {
    expect(ORDER_STATUSES).toEqual([
      'PENDING',
      'APPROVED',
      'ON_THE_WAY',
      'IN_PROGRESS',
      'COMPLETED',
      'CANCELLED',
    ]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm --workspace @solvex/db test -- orders`
Expected: FAIL — cannot resolve `../src/schema/orders`.

- [ ] **Step 3: Create `packages/db/src/schema/orders.ts`**

```ts
import { relations } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { areas } from './customer';
import { services } from './catalog';
import { slotTemplates } from './scheduling';

export const ORDER_STATUSES = [
  'PENDING',
  'APPROVED',
  'ON_THE_WAY',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * A booking. Contact details are SNAPSHOTTED at placement, never joined from
 * `profiles` — editing a profile must not rewrite where a technician was sent.
 * `basePrice`, `creditApplied`, and `total` are integer BDT taka, with
 * total = basePrice - creditApplied.
 */
export const orders = sqliteTable(
  'orders',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    code: text('code').notNull().unique(),
    userId: text('user_id').notNull(),
    serviceId: integer('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'restrict' }),
    comboKey: text('combo_key').notNull().default(''),
    basePrice: integer('base_price').notNull(),
    creditApplied: integer('credit_applied').notNull().default(0),
    total: integer('total').notNull(),
    scheduledDate: text('scheduled_date').notNull(),
    slotId: integer('slot_id')
      .notNull()
      .references(() => slotTemplates.id, { onDelete: 'restrict' }),
    areaId: integer('area_id').references(() => areas.id, { onDelete: 'set null' }),
    nameSnapshot: text('name_snapshot').notNull(),
    phoneSnapshot: text('phone_snapshot').notNull(),
    addressSnapshot: text('address_snapshot').notNull(),
    notes: text('notes'),
    status: text('status').notNull().$type<OrderStatus>().default('PENDING'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    index('orders_user_idx').on(t.userId),
    index('orders_status_idx').on(t.status),
    // The capacity check counts rows for a (date, slot) pair on every booking.
    index('orders_slot_date_idx').on(t.scheduledDate, t.slotId),
  ],
);

/** Append-only status timeline. The customer's tracking page renders this. */
export const orderEvents = sqliteTable(
  'order_events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    status: text('status').notNull().$type<OrderStatus>(),
    note: text('note'),
    adminId: text('admin_id'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index('order_events_order_idx').on(t.orderId)],
);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  service: one(services, { fields: [orders.serviceId], references: [services.id] }),
  slot: one(slotTemplates, { fields: [orders.slotId], references: [slotTemplates.id] }),
  area: one(areas, { fields: [orders.areaId], references: [areas.id] }),
  events: many(orderEvents),
}));

export const orderEventsRelations = relations(orderEvents, ({ one }) => ({
  order: one(orders, { fields: [orderEvents.orderId], references: [orders.id] }),
}));
```

- [ ] **Step 4: Export it from `packages/db/src/schema/index.ts`**

```ts
export * from './settings';
export * from './catalog';
export * from './customer';
export * from './scheduling';
export * from './orders';
```

- [ ] **Step 5: Generate the migration**

Run: `npm --workspace @solvex/db run db:generate`

- [ ] **Step 6: Run the tests**

Run: `npm --workspace @solvex/db test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/db
git commit -m "feat(db): orders and order events schema"
```

---

### Task 7: Referral and credit ledger schema

**Files:**
- Create: `packages/db/src/schema/referral.ts`
- Modify: `packages/db/src/schema/index.ts`
- Test: `packages/db/test/referral.test.ts`

**Interfaces:**
- Consumes: Task 6 `orders`.
- Produces tables `referrals`, `creditLedger`. `referrals.refereeUserId` is `UNIQUE` — a customer can be referred exactly once, which is what makes the payout idempotent.

- [ ] **Step 1: Write the failing test**

Create `packages/db/test/referral.test.ts`:

```ts
import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { getDb, schema } from '../src/index';

describe('referral schema', () => {
  it('links a referrer to a referee and records credit', async () => {
    const db = getDb(env.DB);

    await db
      .insert(schema.referrals)
      .values({ referrerUserId: 'user_a', refereeUserId: 'user_b', status: 'PENDING' });

    await db.insert(schema.creditLedger).values([
      { userId: 'user_a', delta: 200, reason: 'REFERRAL_REWARD' },
      { userId: 'user_a', delta: -150, reason: 'ORDER_DISCOUNT' },
    ]);

    const rows = await db.select().from(schema.creditLedger);
    expect(rows.reduce((sum, r) => sum + r.delta, 0)).toBe(50);
  });

  it('allows a customer to be referred only once', async () => {
    const db = getDb(env.DB);

    await db
      .insert(schema.referrals)
      .values({ referrerUserId: 'user_x', refereeUserId: 'user_once', status: 'PENDING' });

    await expect(
      db
        .insert(schema.referrals)
        .values({ referrerUserId: 'user_y', refereeUserId: 'user_once', status: 'PENDING' }),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm --workspace @solvex/db test -- referral`
Expected: FAIL — `schema.referrals` is undefined.

- [ ] **Step 3: Create `packages/db/src/schema/referral.ts`**

```ts
import { relations } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { orders } from './orders';

export const REFERRAL_STATUSES = ['PENDING', 'REWARDED', 'VOID'] as const;
export type ReferralStatus = (typeof REFERRAL_STATUSES)[number];

export const CREDIT_REASONS = ['REFERRAL_REWARD', 'ORDER_DISCOUNT', 'ADMIN_ADJUSTMENT'] as const;
export type CreditReason = (typeof CREDIT_REASONS)[number];

/**
 * Referral attribution, created at signup. `refereeUserId` is UNIQUE: a
 * customer can be referred exactly once, which is what keeps the reward
 * payout idempotent.
 */
export const referrals = sqliteTable(
  'referrals',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    referrerUserId: text('referrer_user_id').notNull(),
    refereeUserId: text('referee_user_id').notNull().unique(),
    orderId: integer('order_id').references(() => orders.id, { onDelete: 'set null' }),
    status: text('status').notNull().$type<ReferralStatus>().default('PENDING'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index('referrals_referrer_idx').on(t.referrerUserId)],
);

/**
 * Append-only credit ledger, in integer BDT taka. Balance is
 * SUM(delta) WHERE user_id = ?. There is no cached balance column, so there
 * is nothing to drift.
 */
export const creditLedger = sqliteTable(
  'credit_ledger',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id').notNull(),
    delta: integer('delta').notNull(),
    reason: text('reason').notNull().$type<CreditReason>(),
    orderId: integer('order_id').references(() => orders.id, { onDelete: 'set null' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index('credit_ledger_user_idx').on(t.userId)],
);

export const referralsRelations = relations(referrals, ({ one }) => ({
  order: one(orders, { fields: [referrals.orderId], references: [orders.id] }),
}));

export const creditLedgerRelations = relations(creditLedger, ({ one }) => ({
  order: one(orders, { fields: [creditLedger.orderId], references: [orders.id] }),
}));
```

- [ ] **Step 4: Export it from `packages/db/src/schema/index.ts`**

```ts
export * from './settings';
export * from './catalog';
export * from './customer';
export * from './scheduling';
export * from './orders';
export * from './referral';
```

- [ ] **Step 5: Generate the migration**

Run: `npm --workspace @solvex/db run db:generate`

- [ ] **Step 6: Run the tests**

Run: `npm --workspace @solvex/db test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/db
git commit -m "feat(db): referral attribution and credit ledger schema"
```

---

### Task 8: Combination keys and price lookup

Spec §5 and §10 requirement 1. `comboKey` must be order-independent, and a
missing combination must be rejected rather than silently priced.

**Files:**
- Create: `packages/db/src/pricing.ts`
- Modify: `packages/db/src/index.ts`
- Test: `packages/db/test/pricing.test.ts`

**Interfaces:**
- Consumes: `servicePrices`, `variableGroups`, `variableOptions` from Task 3.
- Produces:
  - `buildComboKey(optionIds: number[]): string`
  - `expandCombinations(groups: { id: number; options: { id: number }[] }[]): string[]`
  - `lookupPrice(db: Db, serviceId: number, optionIds: number[]): Promise<number>` — throws `PriceNotFoundError` when no row matches.
  - `class PriceNotFoundError extends Error`

- [ ] **Step 1: Write the failing test**

Create `packages/db/test/pricing.test.ts`:

```ts
import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { getDb, schema } from '../src/index';
import { PriceNotFoundError, buildComboKey, expandCombinations, lookupPrice } from '../src/pricing';

describe('buildComboKey', () => {
  it('is independent of selection order', () => {
    expect(buildComboKey([7, 2, 5])).toBe(buildComboKey([5, 7, 2]));
  });

  it('sorts numerically, not lexically', () => {
    expect(buildComboKey([10, 9])).toBe('9-10');
  });

  it('returns the empty string for a service with no variables', () => {
    expect(buildComboKey([])).toBe('');
  });

  it('rejects duplicate option ids', () => {
    expect(() => buildComboKey([3, 3])).toThrow(/duplicate/i);
  });
});

describe('expandCombinations', () => {
  it('produces the cartesian product, one key per combination', () => {
    const keys = expandCombinations([
      { id: 1, options: [{ id: 10 }, { id: 11 }] },
      { id: 2, options: [{ id: 20 }, { id: 21 }] },
    ]);
    expect(keys.sort()).toEqual(['10-20', '10-21', '11-20', '11-21']);
  });

  it('returns a single empty key when there are no groups', () => {
    expect(expandCombinations([])).toEqual(['']);
  });
});

describe('lookupPrice', () => {
  it('finds the price for a combination regardless of selection order', async () => {
    const db = getDb(env.DB);
    const [category] = await db
      .insert(schema.categories)
      .values({ slug: `c-${crypto.randomUUID()}`, name: 'C' })
      .returning();
    const [service] = await db
      .insert(schema.services)
      .values({ categoryId: category!.id, slug: `s-${crypto.randomUUID()}`, name: 'S' })
      .returning();

    await db
      .insert(schema.servicePrices)
      .values({ serviceId: service!.id, comboKey: '4-9', price: 2200 });

    await expect(lookupPrice(db, service!.id, [9, 4])).resolves.toBe(2200);
  });

  it('throws PriceNotFoundError instead of defaulting to a price', async () => {
    const db = getDb(env.DB);
    const [category] = await db
      .insert(schema.categories)
      .values({ slug: `c-${crypto.randomUUID()}`, name: 'C' })
      .returning();
    const [service] = await db
      .insert(schema.services)
      .values({ categoryId: category!.id, slug: `s-${crypto.randomUUID()}`, name: 'S' })
      .returning();

    await expect(lookupPrice(db, service!.id, [1, 2])).rejects.toBeInstanceOf(PriceNotFoundError);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm --workspace @solvex/db test -- pricing`
Expected: FAIL — cannot resolve `../src/pricing`.

- [ ] **Step 3: Create `packages/db/src/pricing.ts`**

```ts
import { and, eq } from 'drizzle-orm';
import type { Db } from './index';
import { servicePrices } from './schema/catalog';

export class PriceNotFoundError extends Error {
  constructor(serviceId: number, comboKey: string) {
    super(`No price configured for service ${serviceId}, combination "${comboKey}"`);
    this.name = 'PriceNotFoundError';
  }
}

/**
 * Canonical key for a set of selected variable options: ids sorted ascending
 * and joined by "-". Sorting is what makes the key stable regardless of the
 * order the customer picked options in.
 */
export function buildComboKey(optionIds: number[]): string {
  const unique = new Set(optionIds);
  if (unique.size !== optionIds.length) {
    throw new Error(`buildComboKey received duplicate option ids: ${optionIds.join(',')}`);
  }
  return [...optionIds].sort((a, b) => a - b).join('-');
}

/**
 * Every combination of one option per group, as combo keys. Used by the CMS
 * to generate the price matrix and to report which combinations are unpriced.
 */
export function expandCombinations(
  groups: { id: number; options: { id: number }[] }[],
): string[] {
  let acc: number[][] = [[]];
  for (const group of groups) {
    const next: number[][] = [];
    for (const partial of acc) {
      for (const option of group.options) {
        next.push([...partial, option.id]);
      }
    }
    acc = next;
  }
  return acc.map(buildComboKey);
}

/** Price in integer BDT taka. Throws rather than guessing at a default. */
export async function lookupPrice(
  db: Db,
  serviceId: number,
  optionIds: number[],
): Promise<number> {
  const comboKey = buildComboKey(optionIds);
  const row = await db
    .select({ price: servicePrices.price })
    .from(servicePrices)
    .where(and(eq(servicePrices.serviceId, serviceId), eq(servicePrices.comboKey, comboKey)))
    .get();

  if (!row) throw new PriceNotFoundError(serviceId, comboKey);
  return row.price;
}
```

- [ ] **Step 4: Re-export from `packages/db/src/index.ts`**

Add to the bottom of the file:

```ts
export * from './pricing';
```

- [ ] **Step 5: Run the tests**

Run: `npm --workspace @solvex/db test`
Expected: PASS, all files.

- [ ] **Step 6: Commit**

```bash
git add packages/db
git commit -m "feat(db): combination keys and price lookup"
```

---

### Task 9: Credit balance and application

Spec §10 requirement 3. Credit must cap at both the balance and the order
total, and must never produce a negative total.

**Files:**
- Create: `packages/db/src/credit.ts`
- Modify: `packages/db/src/index.ts`
- Test: `packages/db/test/credit.test.ts`

**Interfaces:**
- Consumes: `creditLedger` from Task 7.
- Produces:
  - `getCreditBalance(db: Db, userId: string): Promise<number>`
  - `applicableCredit(balance: number, basePrice: number, requested: number): number`

- [ ] **Step 1: Write the failing test**

Create `packages/db/test/credit.test.ts`:

```ts
import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { getDb, schema } from '../src/index';
import { applicableCredit, getCreditBalance } from '../src/credit';

describe('applicableCredit', () => {
  it('caps at the requested amount when everything is plentiful', () => {
    expect(applicableCredit(1000, 2000, 300)).toBe(300);
  });

  it('caps at the balance', () => {
    expect(applicableCredit(200, 2000, 500)).toBe(200);
  });

  it('caps at the order total, so the total never goes negative', () => {
    expect(applicableCredit(5000, 1200, 5000)).toBe(1200);
  });

  it('returns zero for a negative or zero request', () => {
    expect(applicableCredit(1000, 2000, -50)).toBe(0);
    expect(applicableCredit(1000, 2000, 0)).toBe(0);
  });

  it('returns zero when the balance is negative', () => {
    expect(applicableCredit(-100, 2000, 300)).toBe(0);
  });
});

describe('getCreditBalance', () => {
  it('sums the ledger for one user only', async () => {
    const db = getDb(env.DB);
    const user = `user_${crypto.randomUUID()}`;
    const other = `user_${crypto.randomUUID()}`;

    await db.insert(schema.creditLedger).values([
      { userId: user, delta: 200, reason: 'REFERRAL_REWARD' },
      { userId: user, delta: 200, reason: 'REFERRAL_REWARD' },
      { userId: user, delta: -150, reason: 'ORDER_DISCOUNT' },
      { userId: other, delta: 999, reason: 'REFERRAL_REWARD' },
    ]);

    await expect(getCreditBalance(db, user)).resolves.toBe(250);
  });

  it('returns zero for a user with no ledger rows', async () => {
    const db = getDb(env.DB);
    await expect(getCreditBalance(db, `user_${crypto.randomUUID()}`)).resolves.toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm --workspace @solvex/db test -- credit`
Expected: FAIL — cannot resolve `../src/credit`.

- [ ] **Step 3: Create `packages/db/src/credit.ts`**

```ts
import { eq, sql } from 'drizzle-orm';
import type { Db } from './index';
import { creditLedger } from './schema/referral';

/** Balance in integer BDT taka. The ledger is the only source of truth. */
export async function getCreditBalance(db: Db, userId: string): Promise<number> {
  const row = await db
    .select({ balance: sql<number>`coalesce(sum(${creditLedger.delta}), 0)` })
    .from(creditLedger)
    .where(eq(creditLedger.userId, userId))
    .get();

  return row?.balance ?? 0;
}

/**
 * How much credit may actually be applied to an order, in integer BDT taka.
 * Capped at the balance and at the order total, so the payable total can never
 * go below zero and credit can never be conjured from an overdrawn account.
 */
export function applicableCredit(balance: number, basePrice: number, requested: number): number {
  if (requested <= 0 || balance <= 0 || basePrice <= 0) return 0;
  return Math.min(requested, balance, basePrice);
}
```

- [ ] **Step 4: Re-export from `packages/db/src/index.ts`**

Add:

```ts
export * from './credit';
```

- [ ] **Step 5: Run the tests**

Run: `npm --workspace @solvex/db test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/db
git commit -m "feat(db): credit balance and application caps"
```

---

### Task 10: Slot capacity with a race-safe booking insert

Spec §6 and §10 requirement 2. Two customers booking the last slot at the same
moment must not both succeed.

D1 has no `SERIALIZABLE` transaction we can lean on across statements, so the
guard is a **conditional insert**: a single `INSERT ... SELECT ... WHERE
(SELECT count(*) ...) < capacity` statement, where the count and the write
happen in one atomic SQLite statement. A read-then-write pair cannot be made
safe here.

**Files:**
- Create: `packages/db/src/booking.ts`
- Modify: `packages/db/src/index.ts`
- Test: `packages/db/test/booking.test.ts`

**Interfaces:**
- Consumes: `orders`, `slotCapacity`, `settings`.
- Produces:
  - `getSlotCapacity(db: Db, date: string, slotId: number): Promise<number>`
  - `insertOrderIfSlotAvailable(db: Db, order: NewOrderInput): Promise<number | null>` — returns the new order id, or `null` when the slot is full.
  - `type NewOrderInput`
  - `class SlotFullError extends Error`

- [ ] **Step 1: Write the failing test**

Create `packages/db/test/booking.test.ts`:

```ts
import { env } from 'cloudflare:test';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { getDb, schema } from '../src/index';
import { getSlotCapacity, insertOrderIfSlotAvailable } from '../src/booking';
import type { NewOrderInput } from '../src/booking';

const DATE = '2026-09-01';

async function fixture() {
  const db = getDb(env.DB);
  const [category] = await db
    .insert(schema.categories)
    .values({ slug: `c-${crypto.randomUUID()}`, name: 'C' })
    .returning();
  const [service] = await db
    .insert(schema.services)
    .values({ categoryId: category!.id, slug: `s-${crypto.randomUUID()}`, name: 'S' })
    .returning();
  const [slot] = await db
    .insert(schema.slotTemplates)
    .values({ label: 'Morning', startTime: '09:00', endTime: '12:00' })
    .returning();
  return { db, service: service!, slot: slot! };
}

function orderInput(serviceId: number, slotId: number, code: string): NewOrderInput {
  return {
    code,
    userId: `user_${crypto.randomUUID()}`,
    serviceId,
    comboKey: '',
    basePrice: 1500,
    creditApplied: 0,
    total: 1500,
    scheduledDate: DATE,
    slotId,
    areaId: null,
    nameSnapshot: 'Test Customer',
    phoneSnapshot: '+8801700000000',
    addressSnapshot: 'Somewhere in Dhaka',
    notes: null,
  };
}

describe('getSlotCapacity', () => {
  beforeEach(async () => {
    const db = getDb(env.DB);
    await db.delete(schema.settings);
    await db
      .insert(schema.settings)
      .values({ key: 'default_slot_capacity', value: '3' });
  });

  it('falls back to the default when there is no override row', async () => {
    const { db, slot } = await fixture();
    await expect(getSlotCapacity(db, DATE, slot.id)).resolves.toBe(3);
  });

  it('prefers the per-day override', async () => {
    const { db, slot } = await fixture();
    await db.insert(schema.slotCapacity).values({ date: DATE, slotId: slot.id, capacity: 1 });
    await expect(getSlotCapacity(db, DATE, slot.id)).resolves.toBe(1);
  });
});

describe('insertOrderIfSlotAvailable', () => {
  beforeEach(async () => {
    const db = getDb(env.DB);
    await db.delete(schema.settings);
    await db
      .insert(schema.settings)
      .values({ key: 'default_slot_capacity', value: '2' });
  });

  it('books while capacity remains and refuses once it is gone', async () => {
    const { db, service, slot } = await fixture();

    const first = await insertOrderIfSlotAvailable(db, orderInput(service.id, slot.id, 'SX-A1'));
    const second = await insertOrderIfSlotAvailable(db, orderInput(service.id, slot.id, 'SX-A2'));
    const third = await insertOrderIfSlotAvailable(db, orderInput(service.id, slot.id, 'SX-A3'));

    expect(first).toBeTypeOf('number');
    expect(second).toBeTypeOf('number');
    expect(third).toBeNull();
  });

  it('lets exactly one of two concurrent bookings take the last seat', async () => {
    const { db, service, slot } = await fixture();
    await db.insert(schema.slotCapacity).values({ date: DATE, slotId: slot.id, capacity: 1 });

    const results = await Promise.all([
      insertOrderIfSlotAvailable(db, orderInput(service.id, slot.id, 'SX-B1')),
      insertOrderIfSlotAvailable(db, orderInput(service.id, slot.id, 'SX-B2')),
    ]);

    expect(results.filter((r) => r !== null)).toHaveLength(1);

    const booked = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.scheduledDate, DATE));
    expect(booked).toHaveLength(1);
  });

  it('does not count cancelled orders against capacity', async () => {
    const { db, service, slot } = await fixture();
    await db.insert(schema.slotCapacity).values({ date: DATE, slotId: slot.id, capacity: 1 });

    const id = await insertOrderIfSlotAvailable(db, orderInput(service.id, slot.id, 'SX-C1'));
    expect(id).toBeTypeOf('number');

    await db
      .update(schema.orders)
      .set({ status: 'CANCELLED' })
      .where(eq(schema.orders.id, id!));

    const second = await insertOrderIfSlotAvailable(db, orderInput(service.id, slot.id, 'SX-C2'));
    expect(second).toBeTypeOf('number');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm --workspace @solvex/db test -- booking`
Expected: FAIL — cannot resolve `../src/booking`.

- [ ] **Step 3: Create `packages/db/src/booking.ts`**

```ts
import { and, eq, sql } from 'drizzle-orm';
import type { Db } from './index';
import { settings } from './schema/settings';
import { slotCapacity } from './schema/scheduling';

const DEFAULT_SLOT_CAPACITY_KEY = 'default_slot_capacity';
const FALLBACK_CAPACITY = 0;

export class SlotFullError extends Error {
  constructor(date: string, slotId: number) {
    super(`Slot ${slotId} on ${date} is fully booked`);
    this.name = 'SlotFullError';
  }
}

export type NewOrderInput = {
  code: string;
  userId: string;
  serviceId: number;
  comboKey: string;
  basePrice: number;
  creditApplied: number;
  total: number;
  scheduledDate: string;
  slotId: number;
  areaId: number | null;
  nameSnapshot: string;
  phoneSnapshot: string;
  addressSnapshot: string;
  notes: string | null;
};

/** Per-day override if present, otherwise the global default setting. */
export async function getSlotCapacity(db: Db, date: string, slotId: number): Promise<number> {
  const override = await db
    .select({ capacity: slotCapacity.capacity })
    .from(slotCapacity)
    .where(and(eq(slotCapacity.date, date), eq(slotCapacity.slotId, slotId)))
    .get();

  if (override) return override.capacity;

  const fallback = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, DEFAULT_SLOT_CAPACITY_KEY))
    .get();

  const parsed = Number.parseInt(fallback?.value ?? '', 10);
  return Number.isNaN(parsed) ? FALLBACK_CAPACITY : parsed;
}

/**
 * Insert an order only if the slot still has room, as ONE atomic statement.
 *
 * The count and the write must not be separate statements: between a read and
 * a write, another request can take the last seat. `INSERT ... SELECT ...
 * WHERE (SELECT count(*) ...) < capacity` evaluates the count inside the same
 * SQLite statement that performs the insert, so it cannot interleave.
 *
 * Cancelled orders do not occupy a seat.
 *
 * Returns the new order id, or null when the slot is full.
 */
export async function insertOrderIfSlotAvailable(
  db: Db,
  input: NewOrderInput,
): Promise<number | null> {
  const capacity = await getSlotCapacity(db, input.scheduledDate, input.slotId);
  if (capacity <= 0) return null;

  const now = Date.now();

  const rows = await db.all<{ id: number }>(sql`
    INSERT INTO orders (
      code, user_id, service_id, combo_key, base_price, credit_applied, total,
      scheduled_date, slot_id, area_id,
      name_snapshot, phone_snapshot, address_snapshot, notes, status, created_at
    )
    SELECT
      ${input.code}, ${input.userId}, ${input.serviceId}, ${input.comboKey},
      ${input.basePrice}, ${input.creditApplied}, ${input.total},
      ${input.scheduledDate}, ${input.slotId}, ${input.areaId},
      ${input.nameSnapshot}, ${input.phoneSnapshot}, ${input.addressSnapshot},
      ${input.notes}, 'PENDING', ${now}
    WHERE (
      SELECT count(*) FROM orders
      WHERE scheduled_date = ${input.scheduledDate}
        AND slot_id = ${input.slotId}
        AND status <> 'CANCELLED'
    ) < ${capacity}
    RETURNING id
  `);

  return rows[0]?.id ?? null;
}
```

- [ ] **Step 4: Re-export from `packages/db/src/index.ts`**

Add:

```ts
export * from './booking';
```

- [ ] **Step 5: Run the tests**

Run: `npm --workspace @solvex/db test`
Expected: PASS, all four booking cases.

If the concurrency case fails with both inserts succeeding, the raw SQL was
split into separate count and insert statements — re-read Step 3.

- [ ] **Step 6: Commit**

```bash
git add packages/db
git commit -m "feat(db): race-safe slot capacity booking insert"
```

---

### Task 11: Shared design tokens

**Files:**
- Create: `packages/tokens/package.json`
- Create: `packages/tokens/tokens.css`
- Create: `packages/tokens/cms.css`
- Create: `packages/tokens/README.md`

**Interfaces:**
- Consumes: nothing.
- Produces the `@solvex/tokens` package. Apps import `@solvex/tokens/tokens.css` for the shared palette, and the CMS additionally imports `@solvex/tokens/cms.css` for its density scale.

- [ ] **Step 1: Create `packages/tokens/package.json`**

```json
{
  "name": "@solvex/tokens",
  "version": "0.0.0",
  "private": true,
  "exports": {
    "./tokens.css": "./tokens.css",
    "./cms.css": "./cms.css"
  }
}
```

- [ ] **Step 2: Create `packages/tokens/tokens.css`**

Brand palette shared by both apps. Orange `#FF6300` is taken from
`logo-files/logo-black.svg`; the tint `#FFBA8E` is the logo's secondary.

```css
:root {
  /* Brand */
  --color-primary: #ff6300;
  --color-primary-hover: #e55800;
  --color-primary-tint: #ffba8e;
  --color-primary-foreground: #ffffff;

  /* Surfaces */
  --color-background: #ffffff;
  --color-surface: #f8fafc;
  --color-card: #ffffff;

  /* Text */
  --color-text: #0f172a;
  --color-muted: #717182;

  /* Lines and fields */
  --color-border: rgb(0 0 0 / 0.10);
  --color-input-bg: #f8fafc;

  /* Status */
  --color-success: #16a34a;
  --color-warning: #f59e0b;
  --color-danger: #d4183d;
  --color-info: #2563eb;

  /* Type */
  --font-sans: Inter, system-ui, -apple-system, sans-serif;

  /* Radius */
  --radius-xs: 4px;
  --radius-sm: 8px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 24px;
  --radius-pill: 9999px;

  /* Spacing — 8px rhythm, per the design system doc */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;

  /* Elevation */
  --shadow-sm: 0 1px 2px rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 12px rgb(0 0 0 / 0.08);
  --shadow-lg: 0 12px 32px rgb(0 0 0 / 0.12);

  /* Motion */
  --duration-hover: 150ms;
  --duration-default: 200ms;
  --duration-modal: 300ms;
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-hover: 0ms;
    --duration-default: 0ms;
    --duration-modal: 0ms;
  }
}
```

- [ ] **Step 3: Create `packages/tokens/cms.css`**

Density scale for the back-office only. Measured from the RedeemX reference
back-office; see spec §9.1.

```css
/* Back-office density. Desktop-only, intentionally denser than the webapp. */
:root {
  --cms-sidebar-width: 262px;
  --cms-topbar-height: 56px;

  --cms-control-height: 36px;
  --cms-input-height: 38px;
  --cms-control-radius: var(--radius-lg);
  --cms-card-radius: var(--radius-md);

  --cms-font-size-body: 13px;
  --cms-font-size-label: 13px;
  --cms-font-size-table-head: 11px;
  --cms-font-size-page-title: 32px;
}
```

- [ ] **Step 4: Create `packages/tokens/README.md`**

```markdown
# @solvex/tokens

Design tokens shared by `solvex-cms` and `solvex-webapp`.

- `tokens.css` — brand palette, type, radii, spacing, elevation, motion. Both apps.
- `cms.css` — back-office density scale. CMS only.

## Rules

No component may hardcode a color, radius, spacing value, or duration. Every
visual value comes from a variable in this package. The webapp design has not
been supplied yet, so a restyle must remain a token-file edit rather than a
sweep across every page.

The CMS deliberately uses 36px controls, overriding the 44px minimum in
`claude-code-design-system.md`. That rule is a touch-target rule and stays
binding on the customer-facing webapp; the CMS is desktop-only and clears
WCAG 2.2 AA's 24x24 target minimum.
```

- [ ] **Step 5: Verify the workspace resolves the package**

Run: `npm install && npm ls @solvex/tokens`
Expected: prints `@solvex/tokens@0.0.0 -> ./packages/tokens`.

- [ ] **Step 6: Commit**

```bash
git add packages/tokens package-lock.json
git commit -m "feat(tokens): shared brand tokens and CMS density scale"
```

---

### Task 12: Seed script and Cloudflare provisioning

**Files:**
- Create: `packages/db/src/seed.sql`
- Modify: `packages/db/package.json` (add `db:seed:local`, `db:seed:remote`)
- Create: `docs/PROVISIONING.md`
- Modify: `packages/db/wrangler.jsonc` (real `database_id`)
- Test: `packages/db/test/seed.test.ts`

**Interfaces:**
- Consumes: `settings`, `areas`, `slotTemplates`.
- Produces: baseline reference data — three slot templates, the two required settings keys, and an initial area list. Seeding is idempotent, so re-running it is safe.

- [ ] **Step 1: Write the failing test**

Create `packages/db/test/seed.test.ts`:

```ts
import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { getDb, schema } from '../src/index';
import { getSlotCapacity } from '../src/booking';
import seedSql from '../src/seed.sql?raw';

/** Split on ";" at end of line — the seed file has no procedural SQL. */
function statements(sql: string): string[] {
  return sql
    .split(/;\s*$/m)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));
}

describe('seed', () => {
  it('is idempotent and establishes usable defaults', async () => {
    const db = getDb(env.DB);

    for (const run of [1, 2]) {
      for (const stmt of statements(seedSql)) {
        await env.DB.prepare(stmt).run();
      }
      expect(run).toBeLessThanOrEqual(2);
    }

    const slots = await db.select().from(schema.slotTemplates);
    expect(slots).toHaveLength(3);

    const areas = await db.select().from(schema.areas);
    expect(areas.length).toBeGreaterThan(0);

    const capacity = await getSlotCapacity(db, '2026-12-01', slots[0]!.id);
    expect(capacity).toBe(6);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm --workspace @solvex/db test -- seed`
Expected: FAIL — cannot resolve `../src/seed.sql?raw`.

- [ ] **Step 3: Create `packages/db/src/seed.sql`**

```sql
-- Baseline reference data. Idempotent: safe to re-run.

INSERT INTO settings (key, value) VALUES ('default_slot_capacity', '6')
  ON CONFLICT(key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('referral_reward_taka', '200')
  ON CONFLICT(key) DO NOTHING;

INSERT INTO slot_templates (label, start_time, end_time, sort, active)
  VALUES ('9:00 AM - 12:00 PM', '09:00', '12:00', 1, 1)
  ON CONFLICT DO NOTHING;
INSERT INTO slot_templates (label, start_time, end_time, sort, active)
  VALUES ('12:00 PM - 3:00 PM', '12:00', '15:00', 2, 1)
  ON CONFLICT DO NOTHING;
INSERT INTO slot_templates (label, start_time, end_time, sort, active)
  VALUES ('3:00 PM - 6:00 PM', '15:00', '18:00', 3, 1)
  ON CONFLICT DO NOTHING;

INSERT INTO areas (name, sort, active) VALUES ('Dhanmondi', 1, 1) ON CONFLICT(name) DO NOTHING;
INSERT INTO areas (name, sort, active) VALUES ('Gulshan', 2, 1) ON CONFLICT(name) DO NOTHING;
INSERT INTO areas (name, sort, active) VALUES ('Banani', 3, 1) ON CONFLICT(name) DO NOTHING;
INSERT INTO areas (name, sort, active) VALUES ('Uttara', 4, 1) ON CONFLICT(name) DO NOTHING;
INSERT INTO areas (name, sort, active) VALUES ('Mirpur', 5, 1) ON CONFLICT(name) DO NOTHING;
INSERT INTO areas (name, sort, active) VALUES ('Mohammadpur', 6, 1) ON CONFLICT(name) DO NOTHING;
INSERT INTO areas (name, sort, active) VALUES ('Bashundhara R/A', 7, 1) ON CONFLICT(name) DO NOTHING;
INSERT INTO areas (name, sort, active) VALUES ('Motijheel', 8, 1) ON CONFLICT(name) DO NOTHING;
```

`slot_templates` has no unique constraint on `label`, so `ON CONFLICT DO
NOTHING` there only guards the primary key. The idempotency that matters is on
`settings.key` and `areas.name`; re-running the whole seed against a database
that already has slots would duplicate them. To keep the test honest, guard the
slot inserts on a uniqueness constraint instead — see the next step.

- [ ] **Step 4: Add a uniqueness constraint on slot labels**

Modify `packages/db/src/schema/scheduling.ts` — change the `label` column to:

```ts
  label: text('label').notNull().unique(),
```

Then change the three slot inserts in `seed.sql` to use it:

```sql
INSERT INTO slot_templates (label, start_time, end_time, sort, active)
  VALUES ('9:00 AM - 12:00 PM', '09:00', '12:00', 1, 1)
  ON CONFLICT(label) DO NOTHING;
INSERT INTO slot_templates (label, start_time, end_time, sort, active)
  VALUES ('12:00 PM - 3:00 PM', '12:00', '15:00', 2, 1)
  ON CONFLICT(label) DO NOTHING;
INSERT INTO slot_templates (label, start_time, end_time, sort, active)
  VALUES ('3:00 PM - 6:00 PM', '15:00', '18:00', 3, 1)
  ON CONFLICT(label) DO NOTHING;
```

Run: `npm --workspace @solvex/db run db:generate`
Expected: a migration adding the unique index on `slot_templates.label`.

Note: `packages/db/test/scheduling.test.ts` and `orders.test.ts` insert slots
with fixed labels. Change those inserts to use unique labels
(`` `Morning ${crypto.randomUUID()}` ``) so they do not collide.

- [ ] **Step 5: Add seed scripts to `packages/db/package.json`**

Add to `scripts`:

```json
    "db:seed:local": "wrangler d1 execute solvex-db --local --file=./src/seed.sql",
    "db:seed:remote": "wrangler d1 execute solvex-db --remote --file=./src/seed.sql"
```

- [ ] **Step 6: Run the tests**

Run: `npm --workspace @solvex/db test`
Expected: PASS, every file.

- [ ] **Step 7: Create `docs/PROVISIONING.md`**

```markdown
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

```bash
npm --workspace @solvex/db run db:migrate:local
npm --workspace @solvex/db run db:seed:local

npm --workspace @solvex/db run db:migrate:remote
npm --workspace @solvex/db run db:seed:remote
```

## Secrets

Never commit secrets. Local values go in a gitignored `.dev.vars`; deployed
values go in via `wrangler secret put <NAME>`.
```

- [ ] **Step 8: Commit**

```bash
git add packages/db docs/PROVISIONING.md
git commit -m "feat(db): idempotent seed data and provisioning guide"
```

---

## Phase 0 completion criteria

- [ ] `npm test` passes from the repo root.
- [ ] `npm run typecheck` passes from the repo root.
- [ ] `packages/db/migrations/` contains migrations creating every table in spec §4 except the Better Auth tables, which Phase 1 generates.
- [ ] Spec §10 requirements 1, 2, and 3 have passing tests. Requirement 4 (referral payout) is implemented in Phase 5, where the payout logic lives.
- [ ] `docs/PROVISIONING.md` exists and the user has run it, or has explicitly deferred remote provisioning.

## Self-review notes

**Spec coverage.** §4 tables: settings (T2), catalog (T3), areas + profiles
(T4), scheduling (T5), orders + events (T6), referral + ledger (T7). §5 pricing
(T8). §6 capacity (T10). §9.3 tokens (T11). §10 tests 1–3 (T8, T9, T10); test 4
belongs to Phase 5 and is deliberately deferred. Better Auth tables are
deliberately deferred to Phase 1, which is where `better-auth` is installed and
its schema generated.

**Known deferral.** `profiles.userId` and `orders.userId` have no foreign key to
the Better Auth `user` table in Phase 0 because that table does not exist yet.
Phase 1 must add the constraint as its own migration.
