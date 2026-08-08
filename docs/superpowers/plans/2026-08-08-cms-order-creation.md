# CMS Order Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let CMS staff place an order for an existing customer or a new phone-in ("walk-in") customer, with an optional custom price, and automatically fold a walk-in's history into their real account if they later sign up on the website with the same phone.

**Architecture:** Every piece of new state fits existing columns — no migration. Shared logic (phone normalization, walk-in identity, the merge operation, and `placeOrder`'s price/attribution extension) lives in `@solvex/db` so both apps use identical rules. The CMS gets a three-step wizard (phone lookup → confirm-or-create customer → book) built from existing CMS UI conventions (native `<select>`, `Field`/`Input`/`Button`, client-component forms calling server actions).

**Tech Stack:** Next.js (App Router) x2, Drizzle ORM, Cloudflare D1/Workers, Zod, Vitest (`packages/db` only — the two Next apps have no per-action unit tests, see Global Constraints).

## Global Constraints

- No database migration in this plan. Every task must fit `orders.basePrice`, `order_events.adminId`, `user.email`, `orders.userId`/`credit_ledger.userId` (no FK) as they exist today.
- `priceOverride` on `placeOrder` is only ever set from `solvex-cms/src/app/admin/orders/new/actions.ts`, behind `requireManage('orders')`. Never add it to `solvex-webapp/src/app/(app)/book/[slug]/actions.ts`.
- Every new/modified exported function in a file starting with `'use server'` in either app MUST call one of `requireManage`/`requireView`/`requireOwner` (CMS) or `requireCustomer` (webapp) AND call `audit(...)`/`auditAs(...)`. This is enforced by existing repo-wide tests: `solvex-cms/src/lib/action-guards.test.ts` and `solvex-webapp/src/lib/action-audit.test.ts`. Run these two test files after every action change.
- No unit tests exist for individual CMS/webapp server actions or pages beyond the two guard tests above — this project verifies action/page behavior by running the dev server and driving it in a browser (see the final task). Only `packages/db` has Vitest+D1 unit tests; write those where this plan touches `packages/db`.
- Walk-in customers never get a referral code exposed to them and are never a referral referee — the merge logic must not touch the `referrals` table (see the design doc's Non-goals).
- Follow the design doc exactly: `docs/superpowers/specs/2026-08-08-cms-order-creation-design.md`.

---

### Task 1: Consolidate phone normalization into `@solvex/db`

**Files:**
- Create: `packages/db/src/phone.ts`
- Create: `packages/db/test/phone.test.ts`
- Modify: `packages/db/src/index.ts`
- Delete: `solvex-webapp/src/lib/phone.ts`
- Delete: `solvex-webapp/src/lib/phone.test.ts`
- Delete: `solvex-cms/src/lib/phone.ts`
- Modify: `solvex-webapp/src/app/(app)/profile/complete/actions.ts:10` (import line)
- Modify: `solvex-webapp/src/app/(app)/account/page.tsx:8` (import line)
- Modify: `solvex-cms/src/app/admin/technicians/actions.ts:11` (import line)
- Modify: `solvex-cms/src/app/admin/technicians/page.tsx:11` (import line)
- Modify: `solvex-cms/src/app/admin/orders/[id]/page.tsx:11` (import line)

**Interfaces:**
- Produces: `normaliseBdMobile(input: string): string | null` and `formatBdMobile(normalised: string): string`, both exported from `@solvex/db`.

Both apps currently have byte-identical copies of `normaliseBdMobile`/`formatBdMobile` at `<app>/src/lib/phone.ts`. Later tasks (walk-in phone matching, the merge check) require both apps to normalize identically, so this becomes the one shared copy.

- [ ] **Step 1: Create the shared module**

Create `packages/db/src/phone.ts` with exactly this content (identical logic to the existing `solvex-webapp/src/lib/phone.ts`, moved):

```ts
/**
 * Bangladeshi mobile numbers.
 *
 * Customers type these many ways (01712345678, +8801712345678, 8801712345678,
 * with spaces or dashes). A technician has to dial the stored value, so it is
 * normalised to one canonical form: +8801XXXXXXXXX.
 *
 * Operator prefixes in service are 013–019; 010/011/012 are not valid.
 */
const BD_MOBILE = /^(?:\+?88)?(01[3-9]\d{8})$/;

export function normaliseBdMobile(input: string): string | null {
  const stripped = input.trim().replace(/[\s()-]/g, '');
  const match = BD_MOBILE.exec(stripped);
  if (!match) return null;
  return `+88${match[1]}`;
}

/** Grouped for display: +880 1712-345678 */
export function formatBdMobile(normalised: string): string {
  const m = /^\+88(01\d)(\d{4})(\d{4})$/.exec(normalised);
  if (!m) return normalised;
  return `+880 ${m[1]!.slice(1)}${m[2]!.slice(0, 1)}-${m[2]!.slice(1)}${m[3]}`;
}
```

- [ ] **Step 2: Move the test**

Create `packages/db/test/phone.test.ts` with the existing `solvex-webapp/src/lib/phone.test.ts` content, only changing the import path:

```ts
import { describe, expect, it } from 'vitest';
import { normaliseBdMobile } from '../src/phone';

describe('normaliseBdMobile', () => {
  it('accepts the plain local form', () => {
    expect(normaliseBdMobile('01712345678')).toBe('+8801712345678');
  });

  it('accepts the international forms', () => {
    expect(normaliseBdMobile('+8801712345678')).toBe('+8801712345678');
    expect(normaliseBdMobile('8801712345678')).toBe('+8801712345678');
  });

  it('tolerates spaces, dashes and brackets', () => {
    expect(normaliseBdMobile(' 017-1234 5678 ')).toBe('+8801712345678');
    expect(normaliseBdMobile('(017) 1234-5678')).toBe('+8801712345678');
  });

  it('normalises every accepted form to one canonical value', () => {
    const forms = ['01712345678', '+8801712345678', '8801712345678', '017 1234 5678'];
    const results = new Set(forms.map(normaliseBdMobile));
    expect(results.size).toBe(1);
  });

  it('accepts every in-service operator prefix 013 to 019', () => {
    for (const d of [3, 4, 5, 6, 7, 8, 9]) {
      expect(normaliseBdMobile(`01${d}12345678`)).toBe(`+8801${d}12345678`);
    }
  });

  it('rejects prefixes that are not issued', () => {
    expect(normaliseBdMobile('01012345678')).toBeNull();
    expect(normaliseBdMobile('01112345678')).toBeNull();
    expect(normaliseBdMobile('01212345678')).toBeNull();
  });

  it('rejects wrong lengths', () => {
    expect(normaliseBdMobile('0171234567')).toBeNull();
    expect(normaliseBdMobile('017123456789')).toBeNull();
  });

  it('rejects non-numeric and empty input', () => {
    expect(normaliseBdMobile('')).toBeNull();
    expect(normaliseBdMobile('not a phone')).toBeNull();
    expect(normaliseBdMobile('+1 555 0100')).toBeNull();
  });
});
```

- [ ] **Step 3: Export it from the package**

In `packages/db/src/index.ts`, add one line after `export * from "./place-order";` (line 20):

```ts
export * from './phone';
```

- [ ] **Step 4: Run the moved test**

Run: `cd packages/db && npx vitest run test/phone.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: Delete the old copies and update every import site**

Delete `solvex-webapp/src/lib/phone.ts`, `solvex-webapp/src/lib/phone.test.ts`, and `solvex-cms/src/lib/phone.ts`.

In `solvex-webapp/src/app/(app)/profile/complete/actions.ts`, line 6 currently reads:
```ts
import { schema, isUniqueViolation } from '@solvex/db';
```
change to:
```ts
import { schema, isUniqueViolation, normaliseBdMobile } from '@solvex/db';
```
and delete line 10 (`import { normaliseBdMobile } from '@/lib/phone';`).

In `solvex-webapp/src/app/(app)/account/page.tsx`, delete line 8 (`import { formatBdMobile } from '@/lib/phone';`) and add this line among the existing imports (anywhere before its use is fine, e.g. right after the `lucide-react` import):
```ts
import { formatBdMobile } from '@solvex/db';
```

In `solvex-cms/src/app/admin/technicians/actions.ts`, line 6 currently reads:
```ts
import { isUniqueViolation, schema, setTechnicianCoverage } from '@solvex/db';
```
change to:
```ts
import { isUniqueViolation, normaliseBdMobile, schema, setTechnicianCoverage } from '@solvex/db';
```
and delete line 11 (`import { normaliseBdMobile } from '@/lib/phone';`).

In `solvex-cms/src/app/admin/technicians/page.tsx`, line 2 currently reads:
```ts
import { schema, notDeleted } from '@solvex/db';
```
change to:
```ts
import { schema, notDeleted, formatBdMobile } from '@solvex/db';
```
and delete line 11 (`import { formatBdMobile } from '@/lib/phone';`).

In `solvex-cms/src/app/admin/orders/[id]/page.tsx`, line 3 currently reads:
```ts
import { getTechnicianOptions } from '@solvex/db';
```
change to:
```ts
import { getTechnicianOptions, formatBdMobile } from '@solvex/db';
```
and delete line 11 (`import { formatBdMobile } from '@/lib/phone';`).

- [ ] **Step 6: Verify nothing broke**

Run: `cd packages/db && npx vitest run` (expect all existing tests still pass)
Run: `cd solvex-webapp && npm run typecheck && npm run lint`
Run: `cd solvex-cms && npm run typecheck && npm run lint`
Expected: all four commands exit clean.

- [ ] **Step 7: Commit**

```bash
git add packages/db/src/phone.ts packages/db/test/phone.test.ts packages/db/src/index.ts \
  solvex-webapp/src/lib/phone.ts solvex-webapp/src/lib/phone.test.ts solvex-cms/src/lib/phone.ts \
  "solvex-webapp/src/app/(app)/profile/complete/actions.ts" "solvex-webapp/src/app/(app)/account/page.tsx" \
  solvex-cms/src/app/admin/technicians/actions.ts solvex-cms/src/app/admin/technicians/page.tsx \
  "solvex-cms/src/app/admin/orders/[id]/page.tsx"
git commit -m "refactor(db): consolidate phone normalization into @solvex/db"
```

---

### Task 2: Walk-in identity helpers (`synthesizeWalkInEmail`, `isWalkInEmail`, `findProfileByPhone`)

**Files:**
- Create: `packages/db/src/walkin.ts`
- Create: `packages/db/test/walkin.test.ts`
- Modify: `packages/db/src/index.ts`

**Interfaces:**
- Consumes: `Db` (from `./index`), `profiles` (from `./schema/customer`), `user` (from `./schema/customer-auth`).
- Produces: `WALKIN_EMAIL_DOMAIN: string`, `synthesizeWalkInEmail(normalizedPhone: string): string`, `isWalkInEmail(email: string): boolean`, `findProfileByPhone(db: Db, normalizedPhone: string): Promise<{ userId: string; fullName: string; isWalkIn: boolean } | null>`. Task 3 adds `mergeWalkInIntoRealAccount` to the same file.

- [ ] **Step 1: Write the failing tests**

Create `packages/db/test/walkin.test.ts`:

```ts
import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { getDb, schema } from '../src/index';
import { synthesizeWalkInEmail, isWalkInEmail, findProfileByPhone } from '../src/walkin';

async function makeCustomer(
  db: ReturnType<typeof getDb>,
  opts: { phone: string; email: string; fullName?: string },
) {
  const tag = crypto.randomUUID().slice(0, 8);
  const userId = `user_${tag}`;
  await db.insert(schema.user).values({
    id: userId,
    name: opts.fullName ?? 'Customer',
    email: opts.email,
    emailVerified: !isWalkInEmail(opts.email),
  });
  await db.insert(schema.profiles).values({
    userId,
    fullName: opts.fullName ?? 'Customer',
    phone: opts.phone,
    address: 'Some address',
    referralCode: `REF${tag.toUpperCase()}`,
  });
  return userId;
}

describe('synthesizeWalkInEmail / isWalkInEmail', () => {
  it('round-trips: a synthesized email is recognised as a walk-in', () => {
    expect(isWalkInEmail(synthesizeWalkInEmail('+8801712345678'))).toBe(true);
  });

  it('is deterministic for the same phone', () => {
    expect(synthesizeWalkInEmail('+8801712345678')).toBe(synthesizeWalkInEmail('+8801712345678'));
  });

  it('does not treat a real email as a walk-in', () => {
    expect(isWalkInEmail('rafiq@example.com')).toBe(false);
  });
});

describe('findProfileByPhone', () => {
  it('finds a match and reports it is not a walk-in for a real email', async () => {
    const db = getDb(env.DB);
    const phone = '+8801711111111';
    const userId = await makeCustomer(db, { phone, email: `real-${crypto.randomUUID()}@example.com` });

    const found = await findProfileByPhone(db, phone);
    expect(found).toMatchObject({ userId, isWalkIn: false });
  });

  it('finds a match and reports it is a walk-in for the synthetic email', async () => {
    const db = getDb(env.DB);
    const phone = '+8801722222222';
    const userId = await makeCustomer(db, { phone, email: synthesizeWalkInEmail(phone) });

    const found = await findProfileByPhone(db, phone);
    expect(found).toMatchObject({ userId, isWalkIn: true });
  });

  it('returns null when no profile has that phone', async () => {
    const db = getDb(env.DB);
    expect(await findProfileByPhone(db, '+8801799999999')).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd packages/db && npx vitest run test/walkin.test.ts`
Expected: FAIL — `Cannot find module '../src/walkin'`

- [ ] **Step 3: Implement**

Create `packages/db/src/walkin.ts`:

```ts
import { eq } from 'drizzle-orm';
import type { Db } from './index';
import { profiles } from './schema/customer';
import { user } from './schema/customer-auth';

export const WALKIN_EMAIL_DOMAIN = 'walkin.solvex.local';

/**
 * A deterministic placeholder identity for a phone-in customer with no
 * website account. Better Auth's `user.email` is NOT NULL UNIQUE, so a
 * walk-in still needs an address here — this one is never sent anything, and
 * the account has no `account`/`session` row, so nobody can sign in with it.
 * Deterministic in the phone so re-running "find or create" for the same
 * caller lands on the same customer instead of minting a new one each time.
 */
export function synthesizeWalkInEmail(normalizedPhone: string): string {
  return `${normalizedPhone.replace(/^\+/, '')}@${WALKIN_EMAIL_DOMAIN}`;
}

export function isWalkInEmail(email: string): boolean {
  return email.endsWith(`@${WALKIN_EMAIL_DOMAIN}`);
}

/**
 * Exact match on an already-normalized phone number. Used both to avoid
 * creating a duplicate walk-in for a repeat caller, and to detect a walk-in
 * worth merging when the same phone completes a real signup.
 */
export async function findProfileByPhone(
  db: Db,
  normalizedPhone: string,
): Promise<{ userId: string; fullName: string; isWalkIn: boolean } | null> {
  const [row] = await db
    .select({ userId: profiles.userId, fullName: profiles.fullName, email: user.email })
    .from(profiles)
    .innerJoin(user, eq(user.id, profiles.userId))
    .where(eq(profiles.phone, normalizedPhone))
    .limit(1);

  if (!row) return null;
  return { userId: row.userId, fullName: row.fullName, isWalkIn: isWalkInEmail(row.email) };
}
```

- [ ] **Step 4: Export it and run again**

Add to `packages/db/src/index.ts`, after the `export * from './phone';` line added in Task 1:

```ts
export * from './walkin';
```

Run: `cd packages/db && npx vitest run test/walkin.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/walkin.ts packages/db/test/walkin.test.ts packages/db/src/index.ts
git commit -m "feat(db): add walk-in customer identity helpers"
```

---

### Task 3: `mergeWalkInIntoRealAccount`

**Files:**
- Modify: `packages/db/src/walkin.ts`
- Modify: `packages/db/test/walkin.test.ts`

**Interfaces:**
- Consumes: `orders` (from `./schema/orders`), `creditLedger` (from `./schema/referral`), `user` (already imported in Task 2).
- Produces: `mergeWalkInIntoRealAccount(db: Db, args: { walkInUserId: string; realUserId: string }): Promise<{ ordersMoved: number; creditRowsMoved: number }>`.

- [ ] **Step 1: Write the failing tests**

Append to `packages/db/test/walkin.test.ts` (add these imports to the top of the file alongside the existing ones — the full new import line replaces the old one):

```ts
import { eq } from 'drizzle-orm';
import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { getDb, schema } from '../src/index';
import {
  synthesizeWalkInEmail,
  isWalkInEmail,
  findProfileByPhone,
  mergeWalkInIntoRealAccount,
} from '../src/walkin';
```

Append these two `describe` blocks at the end of the file:

```ts
describe('mergeWalkInIntoRealAccount', () => {
  it('moves orders and credit history onto the real account and removes the walk-in', async () => {
    const db = getDb(env.DB);
    const tag = crypto.randomUUID().slice(0, 8);
    const walkInPhone = '+8801733333333';
    const walkInUserId = await makeCustomer(db, { phone: walkInPhone, email: synthesizeWalkInEmail(walkInPhone) });
    const realUserId = await makeCustomer(db, {
      phone: '+8801744444444',
      email: `real-${crypto.randomUUID()}@example.com`,
    });

    const [category] = await db
      .insert(schema.categories)
      .values({ slug: `cat-${tag}`, name: 'Cat' })
      .returning();
    const [service] = await db
      .insert(schema.services)
      .values({ categoryId: category!.id, slug: `svc-${tag}`, name: 'Service' })
      .returning();
    const [slot] = await db
      .insert(schema.slotTemplates)
      .values({ label: `Slot ${tag}`, startTime: '09:00', endTime: '12:00' })
      .returning();

    await db.insert(schema.orders).values({
      code: `SX-${tag.toUpperCase()}`,
      userId: walkInUserId,
      serviceId: service!.id,
      comboKey: '',
      basePrice: 500,
      creditApplied: 0,
      total: 500,
      scheduledDate: '2026-10-15',
      slotId: slot!.id,
      nameSnapshot: 'Walk In',
      phoneSnapshot: walkInPhone,
      addressSnapshot: 'Some address',
      status: 'PENDING',
    });
    await db.insert(schema.creditLedger).values({ userId: walkInUserId, delta: 100, reason: 'ADMIN_ADJUSTMENT' });

    const result = await mergeWalkInIntoRealAccount(db, { walkInUserId, realUserId });
    expect(result).toEqual({ ordersMoved: 1, creditRowsMoved: 1 });

    const [order] = await db.select().from(schema.orders).where(eq(schema.orders.userId, realUserId));
    expect(order).toBeDefined();

    const [credit] = await db.select().from(schema.creditLedger).where(eq(schema.creditLedger.userId, realUserId));
    expect(credit).toBeDefined();

    const [walkInUser] = await db.select().from(schema.user).where(eq(schema.user.id, walkInUserId));
    expect(walkInUser).toBeUndefined();

    const [walkInProfile] = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, walkInUserId));
    expect(walkInProfile).toBeUndefined();
  });

  it('is a safe no-op when the walk-in has no orders or credit', async () => {
    const db = getDb(env.DB);
    const walkInPhone = '+8801755555555';
    const walkInUserId = await makeCustomer(db, { phone: walkInPhone, email: synthesizeWalkInEmail(walkInPhone) });
    const realUserId = await makeCustomer(db, {
      phone: '+8801766666666',
      email: `real-${crypto.randomUUID()}@example.com`,
    });

    const result = await mergeWalkInIntoRealAccount(db, { walkInUserId, realUserId });
    expect(result).toEqual({ ordersMoved: 0, creditRowsMoved: 0 });

    const [walkInUser] = await db.select().from(schema.user).where(eq(schema.user.id, walkInUserId));
    expect(walkInUser).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd packages/db && npx vitest run test/walkin.test.ts`
Expected: FAIL — `mergeWalkInIntoRealAccount is not a function` (or a TypeScript error if type-checked first)

- [ ] **Step 3: Implement**

In `packages/db/src/walkin.ts`, add these imports at the top (alongside the existing `eq`, `Db`, `profiles`, `user` imports — the full new import block):

```ts
import { eq } from 'drizzle-orm';
import type { Db } from './index';
import { profiles } from './schema/customer';
import { user } from './schema/customer-auth';
import { orders } from './schema/orders';
import { creditLedger } from './schema/referral';
```

Append this function at the end of the file:

```ts
/**
 * Fold a walk-in's order and credit history onto a real account the same
 * person just signed up with, then remove the walk-in identity.
 *
 * `orders.userId` and `credit_ledger.userId` are plain text columns with no FK
 * to `user.id` (see their schema files), so this is a repoint, not a cascade.
 * The walk-in `user` row is deleted last — its `profiles` row cascades with it
 * (that FK has been `onDelete: 'cascade'` since the original CREATE TABLE,
 * unlike columns added later via ALTER TABLE elsewhere in this schema, so the
 * cascade here is live).
 */
export async function mergeWalkInIntoRealAccount(
  db: Db,
  args: { walkInUserId: string; realUserId: string },
): Promise<{ ordersMoved: number; creditRowsMoved: number }> {
  const movedOrders = await db
    .update(orders)
    .set({ userId: args.realUserId })
    .where(eq(orders.userId, args.walkInUserId))
    .returning({ id: orders.id });

  const movedCredit = await db
    .update(creditLedger)
    .set({ userId: args.realUserId })
    .where(eq(creditLedger.userId, args.walkInUserId))
    .returning({ id: creditLedger.id });

  await db.delete(user).where(eq(user.id, args.walkInUserId));

  return { ordersMoved: movedOrders.length, creditRowsMoved: movedCredit.length };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd packages/db && npx vitest run test/walkin.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/walkin.ts packages/db/test/walkin.test.ts
git commit -m "feat(db): add mergeWalkInIntoRealAccount"
```

---

### Task 4: Extend `placeOrder` with `priceOverride` and `placedByAdminId`

**Files:**
- Modify: `packages/db/src/place-order.ts`
- Modify: `packages/db/test/place-order.test.ts`

**Interfaces:**
- Produces: `PlaceOrderInput` gains two optional fields: `priceOverride?: number`, `placedByAdminId?: string`.

- [ ] **Step 1: Write the failing tests**

Append to the `describe('placeOrder', ...)` block in `packages/db/test/place-order.test.ts` (add these four `it` blocks right before the block's closing `});` — i.e. after the last existing test, `'does not spend credit when the slot turns out to be full'`):

```ts
  it('uses priceOverride instead of the catalog price when provided', async () => {
    const f = await fixture({ price: 1500 });
    const result = await placeOrder(f.db, input(f, { priceOverride: 700 }));
    expect(result).toMatchObject({ ok: true, basePrice: 700, total: 700 });
  });

  it('accepts priceOverride even when the combination has no catalog price', async () => {
    const f = await fixture();
    const result = await placeOrder(f.db, input(f, { priceOverride: 500 }));
    expect(result).toMatchObject({ ok: true, basePrice: 500, total: 500 });
  });

  it('writes placedByAdminId onto the initial order event', async () => {
    const f = await fixture({ price: 1000 });
    const result = await placeOrder(f.db, input(f, { placedByAdminId: 'admin_123' }));
    if (!result.ok) throw new Error('expected success');

    const [event] = await f.db
      .select()
      .from(schema.orderEvents)
      .where(eq(schema.orderEvents.orderId, result.orderId));
    expect(event).toMatchObject({ adminId: 'admin_123' });
  });

  it('leaves adminId null when placedByAdminId is not given', async () => {
    const f = await fixture({ price: 1000 });
    const result = await placeOrder(f.db, input(f));
    if (!result.ok) throw new Error('expected success');

    const [event] = await f.db
      .select()
      .from(schema.orderEvents)
      .where(eq(schema.orderEvents.orderId, result.orderId));
    expect(event.adminId).toBeNull();
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd packages/db && npx vitest run test/place-order.test.ts`
Expected: FAIL — TypeScript error, `priceOverride` and `placedByAdminId` do not exist on the input type (or the adminId assertions fail if it type-checks loosely).

- [ ] **Step 3: Implement**

In `packages/db/src/place-order.ts`, change the `PlaceOrderInput` type (currently lines 58–68):

```ts
export type PlaceOrderInput = {
  userId: string;
  serviceId: number;
  /** Selected variable option ids. Empty for a service with no variables. */
  optionIds: number[];
  scheduledDate: string;
  slotId: number;
  /** How much account credit the customer asked to use. Capped server-side. */
  requestedCredit: number;
  notes: string | null;
};
```

to:

```ts
export type PlaceOrderInput = {
  userId: string;
  serviceId: number;
  /** Selected variable option ids. Empty for a service with no variables. */
  optionIds: number[];
  scheduledDate: string;
  slotId: number;
  /** How much account credit the customer asked to use. Capped server-side. */
  requestedCredit: number;
  notes: string | null;
  /**
   * Admin-set price, bypassing the catalog matrix entirely. Only ever set by
   * the CMS's `createOrderForCustomer` action, behind `requireManage('orders')`
   * — see the "Trust boundary" section of
   * docs/superpowers/specs/2026-08-08-cms-order-creation-design.md. Never set
   * this from a customer-facing code path.
   */
  priceOverride?: number;
  /** The CMS employee who placed this order, if any. Written onto the initial order event. */
  placedByAdminId?: string;
};
```

Change the price-resolution block (currently lines 138–145):

```ts
  // The price comes from the matrix for the exact combination — never from input.
  let basePrice: number;
  try {
    basePrice = await lookupPrice(db, input.serviceId, input.optionIds);
  } catch (err) {
    if (err instanceof PriceNotFoundError) return { ok: false, reason: 'not-priced' };
    throw err;
  }
```

to:

```ts
  // The price comes from the matrix for the exact combination — never from
  // input — UNLESS an admin has explicitly overridden it (priceOverride).
  let basePrice: number;
  if (input.priceOverride !== undefined) {
    basePrice = input.priceOverride;
  } else {
    try {
      basePrice = await lookupPrice(db, input.serviceId, input.optionIds);
    } catch (err) {
      if (err instanceof PriceNotFoundError) return { ok: false, reason: 'not-priced' };
      throw err;
    }
  }
```

Change the initial order-events insert (currently lines 209–213):

```ts
  await db.insert(orderEvents).values({
    orderId,
    status: 'PENDING',
    note: 'Order placed',
  });
```

to:

```ts
  await db.insert(orderEvents).values({
    orderId,
    status: 'PENDING',
    note: 'Order placed',
    adminId: input.placedByAdminId ?? null,
  });
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd packages/db && npx vitest run test/place-order.test.ts`
Expected: PASS (all tests, including the 4 new ones — 20 total in the `placeOrder` describe block)

- [ ] **Step 5: Run the full package test suite**

Run: `cd packages/db && npx vitest run`
Expected: PASS, all files.

- [ ] **Step 6: Commit**

```bash
git add packages/db/src/place-order.ts packages/db/test/place-order.test.ts
git commit -m "feat(db): support admin price override and placedByAdminId in placeOrder"
```

---

### Task 5: `getBookingCatalog` for the CMS booking picker

**Files:**
- Create: `packages/db/src/booking-catalog.ts`
- Modify: `packages/db/src/index.ts`

**Interfaces:**
- Consumes: `categories`, `services`, `variableGroups`, `variableOptions`, `servicePrices` (from `./schema/catalog`).
- Produces: `BookingCatalogService = { id: number; name: string; categoryName: string }`, `BookingCatalogGroup = { id: number; serviceId: number; name: string; options: { id: number; label: string }[] }`, `BookingCatalogPrice = { serviceId: number; comboKey: string; price: number }`, `BookingCatalog = { services: BookingCatalogService[]; groups: BookingCatalogGroup[]; prices: BookingCatalogPrice[] }`, `getBookingCatalog(db: Db): Promise<BookingCatalog>`.

No dedicated unit test for this task — it is a straight read with no branching logic to assert on beyond "active/visible only" filtering, which is exercised indirectly by the end-to-end verification task. This mirrors `getGeography`, which also has no dedicated test file.

- [ ] **Step 1: Implement**

Create `packages/db/src/booking-catalog.ts`:

```ts
import { and, asc, eq } from 'drizzle-orm';
import type { Db } from './index';
import { categories, services, variableGroups, variableOptions, servicePrices } from './schema/catalog';

export type BookingCatalogService = { id: number; name: string; categoryName: string };
export type BookingCatalogGroup = {
  id: number;
  serviceId: number;
  name: string;
  options: { id: number; label: string }[];
};
export type BookingCatalogPrice = { serviceId: number; comboKey: string; price: number };

export type BookingCatalog = {
  services: BookingCatalogService[];
  groups: BookingCatalogGroup[];
  prices: BookingCatalogPrice[];
};

/**
 * The full active, bookable catalog, flat, for the CMS order-creation picker.
 * Same shape idea as `getGeography`: one small bulk read, filtered client-side
 * as service and options are picked, rather than a round trip per selection —
 * the CMS does not know which service the staff member will pick in advance,
 * unlike the customer-facing /book/[slug] page, which already knows.
 */
export async function getBookingCatalog(db: Db): Promise<BookingCatalog> {
  const publiclyVisible = and(eq(services.active, true), eq(categories.active, true));

  const serviceRows = await db
    .select({ id: services.id, name: services.name, categoryName: categories.name })
    .from(services)
    .innerJoin(categories, eq(categories.id, services.categoryId))
    .where(publiclyVisible)
    .orderBy(asc(categories.sort), asc(services.sort), asc(services.name));

  const groupRows = await db
    .select({ id: variableGroups.id, serviceId: variableGroups.serviceId, name: variableGroups.name })
    .from(variableGroups)
    .innerJoin(services, eq(services.id, variableGroups.serviceId))
    .innerJoin(categories, eq(categories.id, services.categoryId))
    .where(publiclyVisible)
    .orderBy(asc(variableGroups.sort));

  const groups: BookingCatalogGroup[] = await Promise.all(
    groupRows.map(async (group) => ({
      ...group,
      options: await db
        .select({ id: variableOptions.id, label: variableOptions.label })
        .from(variableOptions)
        .where(eq(variableOptions.groupId, group.id))
        .orderBy(asc(variableOptions.sort)),
    })),
  );

  const priceRows = await db
    .select({ serviceId: servicePrices.serviceId, comboKey: servicePrices.comboKey, price: servicePrices.price })
    .from(servicePrices)
    .innerJoin(services, eq(services.id, servicePrices.serviceId))
    .innerJoin(categories, eq(categories.id, services.categoryId))
    .where(publiclyVisible);

  return { services: serviceRows, groups, prices: priceRows };
}
```

- [ ] **Step 2: Export it**

Add to `packages/db/src/index.ts`, after `export * from './walkin';`:

```ts
export * from './booking-catalog';
```

- [ ] **Step 3: Typecheck**

Run: `cd packages/db && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/booking-catalog.ts packages/db/src/index.ts
git commit -m "feat(db): add getBookingCatalog for the CMS order picker"
```

---

### Task 6: Wire walk-in merge into the webapp's `saveProfile`

**Files:**
- Modify: `solvex-webapp/src/app/(app)/profile/complete/actions.ts`

**Interfaces:**
- Consumes: `findProfileByPhone`, `mergeWalkInIntoRealAccount` (both from `@solvex/db`, Tasks 2–3).

No dedicated unit test — `solvex-webapp` has no per-action test harness (see Global Constraints); this is verified end-to-end in the final task by creating a walk-in via the CMS, then signing up on the webapp with the same phone.

- [ ] **Step 1: Implement**

In `solvex-webapp/src/app/(app)/profile/complete/actions.ts`, line 6 currently reads (after Task 1's change):
```ts
import { schema, isUniqueViolation, normaliseBdMobile } from '@solvex/db';
```
change to:
```ts
import {
  schema,
  isUniqueViolation,
  normaliseBdMobile,
  findProfileByPhone,
  mergeWalkInIntoRealAccount,
} from '@solvex/db';
```

The existing code (lines 123–129) reads:

```ts
  await audit({
    action: existing.length > 0 ? 'profile.update' : 'profile.create',
    targetType: 'profile',
    targetId: customer.id,
    targetLabel: fullName,
    detail: { areaId, locationId, phoneSet: Boolean(phone), addressSet: Boolean(address) },
  });

  revalidatePath('/account');
  revalidatePath('/profile/complete');
  return { ok: true };
```

Insert a new block between the `audit({...})` call and `revalidatePath('/account');`, so it reads:

```ts
  await audit({
    action: existing.length > 0 ? 'profile.update' : 'profile.create',
    targetType: 'profile',
    targetId: customer.id,
    targetLabel: fullName,
    detail: { areaId, locationId, phoneSet: Boolean(phone), addressSet: Boolean(address) },
  });

  // A walk-in customer created from the CMS phone-order flow uses a synthetic
  // email keyed to their phone number (see @solvex/db's walkin.ts). If this
  // real signup used the same phone, fold that walk-in's order and credit
  // history onto this account. A failure here must never block the customer's
  // own profile save, which has already succeeded by this point.
  const walkInMatch = await findProfileByPhone(d, phone);
  if (walkInMatch && walkInMatch.userId !== customer.id && walkInMatch.isWalkIn) {
    try {
      const merged = await mergeWalkInIntoRealAccount(d, {
        walkInUserId: walkInMatch.userId,
        realUserId: customer.id,
      });
      await audit({
        action: 'profile.merge-walkin',
        targetType: 'profile',
        targetId: customer.id,
        detail: merged,
      });
    } catch (err) {
      await audit({
        action: 'profile.merge-walkin',
        targetType: 'profile',
        targetId: customer.id,
        outcome: 'ERROR',
        reason: err instanceof Error ? err.message : 'unknown error',
      });
    }
  }

  revalidatePath('/account');
  revalidatePath('/profile/complete');
  return { ok: true };
```

- [ ] **Step 2: Typecheck and run the action-audit guard test**

Run: `cd solvex-webapp && npm run typecheck`
Run: `cd solvex-webapp && npx vitest run src/lib/action-audit.test.ts`
Expected: both pass. (`saveProfile` still calls `requireCustomer` and `audit`, unchanged from before this task, so the guard test's requirements are still met.)

- [ ] **Step 3: Commit**

```bash
git add "solvex-webapp/src/app/(app)/profile/complete/actions.ts"
git commit -m "feat(web): merge walk-in customer history into a matching real signup"
```

---

### Task 7: Port `AddressPicker` to the CMS

**Files:**
- Create: `solvex-cms/src/components/ui/address-picker.tsx`

**Interfaces:**
- Consumes: `type Geography` (from `@solvex/db`, already defined in `packages/db/src/geography.ts`).
- Produces: `AddressPicker({ geography, initialAreaId, initialLocationId, areaSelectId }): JSX.Element`, a client component rendering `name="areaId"` (required) and `name="locationId"` (optional, conditionally rendered) native selects.

- [ ] **Step 1: Implement**

Create `solvex-cms/src/components/ui/address-picker.tsx`:

```tsx
'use client';

import { useMemo, useState } from 'react';
import type { Geography } from '@solvex/db';

const UNZONED = '__unzoned__';
const SELECT_CLASS =
  'h-[var(--cms-input-height)] rounded-[var(--cms-control-radius)] border border-[var(--color-border)] ' +
  'bg-[var(--color-input-bg)] px-3 text-[13px] text-[var(--color-text)]';

/**
 * Zone → Area → Location, three selects that narrow each other. Ported from
 * the webapp's AddressPicker (solvex-webapp/src/components/ui/address-picker.tsx)
 * for the CMS's walk-in "new customer" form. There is no shared UI package
 * between the two Next apps — see the "CMS changes" section of
 * docs/superpowers/specs/2026-08-08-cms-order-creation-design.md for why this
 * one small duplication is accepted rather than introducing one.
 */
export function AddressPicker({
  geography,
  initialAreaId,
  initialLocationId,
  areaSelectId,
}: {
  geography: Geography;
  initialAreaId: number | null;
  initialLocationId: number | null;
  areaSelectId?: string;
}) {
  const initialArea = geography.areas.find((a) => a.id === initialAreaId);

  const [zoneFilter, setZoneFilter] = useState<string>(
    initialArea ? (initialArea.zoneId === null ? UNZONED : String(initialArea.zoneId)) : '',
  );
  const [areaId, setAreaId] = useState<string>(initialAreaId ? String(initialAreaId) : '');
  const [locationId, setLocationId] = useState<string>(
    initialLocationId ? String(initialLocationId) : '',
  );

  const hasUnzoned = useMemo(() => geography.areas.some((a) => a.zoneId === null), [geography]);

  const visibleAreas = useMemo(() => {
    if (!zoneFilter) return geography.areas;
    if (zoneFilter === UNZONED) return geography.areas.filter((a) => a.zoneId === null);
    return geography.areas.filter((a) => a.zoneId === Number(zoneFilter));
  }, [geography.areas, zoneFilter]);

  const visibleLocations = useMemo(
    () => geography.locations.filter((l) => l.areaId === Number(areaId)),
    [geography.locations, areaId],
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      {geography.zones.length > 0 && (
        <select
          aria-label="Zone"
          className={`flex-1 ${SELECT_CLASS}`}
          value={zoneFilter}
          onChange={(e) => {
            const next = e.target.value;
            setZoneFilter(next);
            // Changing the zone invalidates whatever area was picked from a
            // different zone's list.
            const stillVisible =
              !next ||
              (next === UNZONED
                ? geography.areas.find((a) => String(a.id) === areaId)?.zoneId === null
                : geography.areas.find((a) => String(a.id) === areaId)?.zoneId === Number(next));
            if (!stillVisible) {
              setAreaId('');
              setLocationId('');
            }
          }}
        >
          <option value="">All zones</option>
          {geography.zones.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zone.name}
            </option>
          ))}
          {hasUnzoned && <option value={UNZONED}>Other areas</option>}
        </select>
      )}

      <select
        id={areaSelectId}
        aria-label={areaSelectId ? undefined : 'Area'}
        name="areaId"
        required
        className={`flex-1 ${SELECT_CLASS}`}
        value={areaId}
        onChange={(e) => {
          setAreaId(e.target.value);
          // A location from the previous area would silently point at the
          // wrong place if left in place.
          setLocationId('');
        }}
      >
        <option value="" disabled>
          Choose an area
        </option>
        {visibleAreas.map((area) => (
          <option key={area.id} value={area.id}>
            {area.name}
          </option>
        ))}
      </select>

      {areaId && visibleLocations.length > 0 && (
        <select
          aria-label="Location (optional)"
          name="locationId"
          className={`flex-1 ${SELECT_CLASS}`}
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
        >
          <option value="">Nearest neighbourhood (optional)</option>
          {visibleLocations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd solvex-cms && npm run typecheck`
Expected: no errors. (Nothing imports this component yet — Task 9 does — so this step only confirms the file itself compiles; a currently-unused exported component is not a typecheck error in this codebase's config.)

- [ ] **Step 3: Commit**

```bash
git add solvex-cms/src/components/ui/address-picker.tsx
git commit -m "feat(cms): port AddressPicker for the walk-in customer form"
```

---

### Task 8: CMS actions — `createWalkInCustomer` and `createOrderForCustomer`

**Files:**
- Create: `solvex-cms/src/app/admin/orders/new/actions.ts`

**Interfaces:**
- Consumes: `schema`, `isUniqueViolation`, `findProfileByPhone`, `synthesizeWalkInEmail`, `placeOrder` (all from `@solvex/db`), `db` (from `@/lib/cf`), `requireManage` (from `@/lib/session`), `audit` (from `@/lib/audit`).
- Produces: `createWalkInCustomer(formData: FormData): Promise<{ ok: true; userId: string } | { ok: false; error: string }>`, `createOrderForCustomer(formData: FormData): Promise<{ ok: true; code: string } | { ok: false; error: string }>`. Both consumed by Task 9's client components.

- [ ] **Step 1: Implement**

Create `solvex-cms/src/app/admin/orders/new/actions.ts`:

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { schema, isUniqueViolation, findProfileByPhone, synthesizeWalkInEmail, placeOrder } from '@solvex/db';
import { db } from '@/lib/cf';
import { requireManage } from '@/lib/session';
import { audit } from '@/lib/audit';

export type CreateCustomerResult = { ok: true; userId: string } | { ok: false; error: string };
export type CreateOrderResult = { ok: true; code: string } | { ok: false; error: string };

/** Unambiguous alphabet: no O/0, I/1, so a code can be read out over the phone. */
const REFERRAL_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateReferralCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => REFERRAL_ALPHABET[b % REFERRAL_ALPHABET.length]).join('');
}

const WalkInCustomerInput = z.object({
  fullName: z.string().trim().min(2, 'Enter a full name.').max(80),
  // The phone comes from this form's own hidden field, already normalized by
  // the page that rendered it — validated again here since a server action is
  // its own POST endpoint, reachable however the request was constructed.
  phone: z.string().min(1, 'Missing phone number.'),
  address: z.string().trim().min(10, 'Give enough detail for a technician to find them.').max(300),
  areaId: z.coerce.number().int().positive('Choose an area.'),
  locationId: z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v && v !== '' ? Number(v) : null)),
});

/**
 * Find an existing customer by phone, or create a minimal "walk-in" one.
 *
 * A walk-in user row has a synthetic email (see @solvex/db's walkin.ts) and no
 * `account`/`session` row, so it cannot sign in — staff manage its orders from
 * here. If the same phone later completes a real signup on the website, that
 * signup's `saveProfile` action folds this history into the real account (see
 * Task 6 / docs/superpowers/specs/2026-08-08-cms-order-creation-design.md).
 */
export async function createWalkInCustomer(formData: FormData): Promise<CreateCustomerResult> {
  await requireManage('customers');

  const parsed = WalkInCustomerInput.safeParse({
    fullName: formData.get('fullName'),
    phone: formData.get('phone'),
    address: formData.get('address'),
    areaId: formData.get('areaId'),
    locationId: formData.get('locationId'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the form.' };
  }

  const { fullName, phone, address, areaId, locationId } = parsed.data;
  const d = db();

  // A repeat caller: reuse their existing customer (walk-in or real) rather
  // than creating a second one.
  const existing = await findProfileByPhone(d, phone);
  if (existing) {
    return { ok: true, userId: existing.userId };
  }

  const [area] = await d
    .select({ id: schema.areas.id })
    .from(schema.areas)
    .where(and(eq(schema.areas.id, areaId), eq(schema.areas.active, true)))
    .limit(1);
  if (!area) return { ok: false, error: 'That area is no longer available. Pick another.' };

  const userId = crypto.randomUUID();
  const email = synthesizeWalkInEmail(phone);

  try {
    await d.insert(schema.user).values({ id: userId, name: fullName, email, emailVerified: false });
  } catch (err) {
    if (isUniqueViolation(err, 'user.email')) {
      return { ok: false, error: 'A customer with this phone already exists. Refresh and search again.' };
    }
    throw err;
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const referralCode = generateReferralCode();
    try {
      await d.insert(schema.profiles).values({ userId, fullName, phone, address, areaId, locationId, referralCode });
      break;
    } catch (err) {
      if (isUniqueViolation(err, 'profiles.referral_code') && attempt < 4) continue;
      throw err;
    }
  }

  await audit({
    action: 'customer.create-walkin',
    module: 'customers',
    targetType: 'profile',
    targetId: userId,
    targetLabel: fullName,
    detail: { phone, areaId, locationId },
  });

  revalidatePath('/admin/customers');
  return { ok: true, userId };
}

const OrderInput = z.object({
  userId: z.string().min(1, 'Missing customer.'),
  serviceId: z.coerce.number().int().positive('Choose a service.'),
  optionIds: z
    .string()
    .optional()
    .transform((v) =>
      (v ?? '')
        .split(',')
        .map((s) => Number.parseInt(s.trim(), 10))
        .filter((n) => Number.isInteger(n) && n > 0),
    ),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date.'),
  slotId: z.coerce.number().int().positive('Choose a time window.'),
  requestedCredit: z.coerce.number().int().min(0).max(10_000_000).default(0),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
  priceOverride: z
    .string()
    .optional()
    .transform((v) => (v && v !== '' ? Number(v) : undefined))
    .refine((v) => v === undefined || (Number.isInteger(v) && v >= 0), {
      message: 'Custom price must be a whole number, 0 or more.',
    }),
});

const MESSAGES: Record<string, string> = {
  'no-profile': 'This customer has no profile on file.',
  'service-unavailable': 'That service is no longer available.',
  'slot-unavailable': 'That time window is no longer available.',
  'area-unavailable': "We are not currently booking in this customer's area.",
  'not-priced': 'That combination is not priced. Set a custom price to continue.',
  'slot-full': 'That window just filled up. Please pick another.',
};

/** Places an order on behalf of an existing or just-created customer. */
export async function createOrderForCustomer(formData: FormData): Promise<CreateOrderResult> {
  const admin = await requireManage('orders');

  const parsed = OrderInput.safeParse({
    userId: formData.get('userId'),
    serviceId: formData.get('serviceId'),
    optionIds: formData.get('optionIds'),
    scheduledDate: formData.get('scheduledDate'),
    slotId: formData.get('slotId'),
    requestedCredit: formData.get('requestedCredit') || 0,
    notes: formData.get('notes'),
    priceOverride: formData.get('priceOverride'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the form.' };
  }

  const { userId, serviceId, optionIds, scheduledDate, slotId, requestedCredit, notes, priceOverride } = parsed.data;

  const today = new Date().toISOString().slice(0, 10);
  if (scheduledDate < today) {
    return { ok: false, error: 'Choose a date from today onwards.' };
  }

  const result = await placeOrder(db(), {
    userId,
    serviceId,
    optionIds,
    scheduledDate,
    slotId,
    requestedCredit,
    notes: notes || null,
    priceOverride,
    placedByAdminId: admin.id,
  });

  if (!result.ok) {
    await audit({
      action: 'orders.place',
      module: 'orders',
      targetType: 'service',
      targetId: serviceId,
      outcome: 'ERROR',
      reason: result.reason,
      detail: { userId, scheduledDate, slotId, requestedCredit, priceOverride: priceOverride ?? null },
    });
    return { ok: false, error: MESSAGES[result.reason] ?? 'Could not place that order.' };
  }

  await audit({
    action: 'orders.place',
    module: 'orders',
    targetType: 'order',
    targetId: result.orderId,
    targetLabel: result.code,
    detail: {
      userId,
      serviceId,
      optionIds,
      scheduledDate,
      slotId,
      creditApplied: result.creditApplied,
      priceOverride: priceOverride ?? null,
    },
  });

  revalidatePath('/admin/orders');
  revalidatePath('/admin/customers');
  return { ok: true, code: result.code };
}
```

- [ ] **Step 2: Typecheck**

Run: `cd solvex-cms && npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Run the guard tests**

Run: `cd solvex-cms && npx vitest run src/lib/action-guards.test.ts`
Expected: PASS — both actions call `requireManage(` and `audit(`.

- [ ] **Step 4: Commit**

```bash
git add solvex-cms/src/app/admin/orders/new/actions.ts
git commit -m "feat(cms): add createWalkInCustomer and createOrderForCustomer actions"
```

---

### Task 9: The `/admin/orders/new` wizard page

**Files:**
- Create: `solvex-cms/src/app/admin/orders/new/page.tsx`
- Create: `solvex-cms/src/app/admin/orders/new/new-customer-form.tsx`
- Create: `solvex-cms/src/app/admin/orders/new/booking-form.tsx`

**Interfaces:**
- Consumes: `createWalkInCustomer`, `createOrderForCustomer` (Task 8), `AddressPicker` (Task 7), `getBookingCatalog`/`BookingCatalog` (Task 5), `getGeography`/`type Geography`, `getAvailability`/`type SlotAvailability`, `getCreditBalance`, `normaliseBdMobile`, `findProfileByPhone` (all `@solvex/db`).

- [ ] **Step 1: Booking form client component**

Create `solvex-cms/src/app/admin/orders/new/booking-form.tsx`:

```tsx
'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { BookingCatalog, SlotAvailability } from '@solvex/db';
import { Field, Input, Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { createOrderForCustomer } from './actions';

const SELECT_CLASS =
  'h-[var(--cms-input-height)] w-full rounded-[var(--cms-control-radius)] border border-[var(--color-border)] ' +
  'bg-[var(--color-input-bg)] px-3 text-[13px] text-[var(--color-text)]';

function buildComboKey(optionIds: number[]): string {
  return [...optionIds].sort((a, b) => a - b).join('-');
}

export function BookingForm({
  userId,
  catalog,
  creditBalance,
  initialAvailability,
  initialDate,
}: {
  userId: string;
  catalog: BookingCatalog;
  creditBalance: number;
  initialAvailability: SlotAvailability[];
  initialDate: string;
}) {
  const router = useRouter();
  const [serviceId, setServiceId] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<Record<number, string>>({});
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  const groups = useMemo(
    () => catalog.groups.filter((g) => g.serviceId === Number(serviceId)),
    [catalog.groups, serviceId],
  );

  const optionIds = groups
    .map((g) => selectedOptions[g.id])
    .filter((v): v is string => Boolean(v))
    .map(Number);

  const allOptionsChosen = groups.length > 0 && optionIds.length === groups.length;
  const comboKey = buildComboKey(optionIds);
  const catalogPrice =
    serviceId && (groups.length === 0 || allOptionsChosen)
      ? (catalog.prices.find((p) => p.serviceId === Number(serviceId) && p.comboKey === comboKey)?.price ?? null)
      : null;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);

    const data = new FormData(e.currentTarget);
    data.set('userId', userId);
    data.set('optionIds', optionIds.join(','));

    const result = await createOrderForCustomer(data);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push('/admin/orders');
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label="Service" htmlFor="serviceId">
        <select
          id="serviceId"
          name="serviceId"
          required
          value={serviceId}
          onChange={(e) => {
            setServiceId(e.target.value);
            setSelectedOptions({});
          }}
          className={SELECT_CLASS}
        >
          <option value="" disabled>
            Choose a service
          </option>
          {catalog.services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.categoryName} — {s.name}
            </option>
          ))}
        </select>
      </Field>

      {groups.map((group) => (
        <Field key={group.id} label={group.name} htmlFor={`group-${group.id}`}>
          <select
            id={`group-${group.id}`}
            required
            value={selectedOptions[group.id] ?? ''}
            onChange={(e) => setSelectedOptions((prev) => ({ ...prev, [group.id]: e.target.value }))}
            className={SELECT_CLASS}
          >
            <option value="" disabled>
              {`Choose ${group.name.toLowerCase()}`}
            </option>
            {group.options.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </Field>
      ))}

      <Field label="Date" htmlFor="scheduledDate">
        <Input id="scheduledDate" name="scheduledDate" type="date" required defaultValue={initialDate} min={initialDate} />
      </Field>

      <Field
        label="Time window"
        htmlFor="slotId"
        hint="Availability shown is for the date above at page load. If you change the date, the server still checks capacity when you submit."
      >
        <select id="slotId" name="slotId" required defaultValue="" className={SELECT_CLASS}>
          <option value="" disabled>
            Choose a time window
          </option>
          {initialAvailability.map((slot) => (
            <option key={slot.slotId} value={slot.slotId} disabled={slot.remaining <= 0}>
              {slot.label} ({slot.startTime}–{slot.endTime}) — {slot.remaining} left
            </option>
          ))}
        </select>
      </Field>

      {creditBalance > 0 && (
        <Field label="Credit to apply" htmlFor="requestedCredit" hint={`Balance: ৳${creditBalance}`}>
          <Input
            id="requestedCredit"
            name="requestedCredit"
            type="number"
            min={0}
            max={creditBalance}
            defaultValue={0}
          />
        </Field>
      )}

      <Field
        label="Custom price (optional)"
        htmlFor="priceOverride"
        hint={
          catalogPrice !== null
            ? `Catalog price: ৳${catalogPrice}. Leave blank to use it.`
            : 'Leave blank to use the catalog price.'
        }
      >
        <Input
          id="priceOverride"
          name="priceOverride"
          type="number"
          min={0}
          placeholder={catalogPrice !== null ? String(catalogPrice) : undefined}
        />
      </Field>

      <Field label="Notes" htmlFor="notes">
        <Textarea id="notes" name="notes" maxLength={500} />
      </Field>

      {error && (
        <p role="alert" className="text-[13px] text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? 'Placing order…' : 'Place order'}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: New-customer form client component**

Create `solvex-cms/src/app/admin/orders/new/new-customer-form.tsx`:

```tsx
'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { Geography } from '@solvex/db';
import { Field, Input, Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AddressPicker } from '@/components/ui/address-picker';
import { createWalkInCustomer } from './actions';

export function NewCustomerForm({ phone, geography }: { phone: string; geography: Geography }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);

    const result = await createWalkInCustomer(new FormData(e.currentTarget));
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(`/admin/orders/new?userId=${result.userId}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label="Full name" htmlFor="fullName">
        <Input id="fullName" name="fullName" required />
      </Field>

      <input type="hidden" name="phone" value={phone} />
      <Field label="Phone" htmlFor="phone-display">
        <Input id="phone-display" value={phone} disabled readOnly />
      </Field>

      <Field label="Address" htmlFor="address" hint="House and road number, plus a landmark if it helps.">
        <Textarea id="address" name="address" required minLength={10} maxLength={300} />
      </Field>

      <Field label="Area" htmlFor="areaId">
        <AddressPicker areaSelectId="areaId" geography={geography} initialAreaId={null} initialLocationId={null} />
      </Field>

      {error && (
        <p role="alert" className="text-[13px] text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? 'Creating…' : 'Create customer & continue'}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: The wizard page**

Create `solvex-cms/src/app/admin/orders/new/page.tsx`:

```tsx
import Link from 'next/link';
import { eq } from 'drizzle-orm';
import {
  schema,
  getGeography,
  getBookingCatalog,
  getAvailability,
  getCreditBalance,
  normaliseBdMobile,
  findProfileByPhone,
} from '@solvex/db';
import { db } from '@/lib/cf';
import { requireView } from '@/lib/session';
import { Topbar, PageHeader } from '@/components/layout/page-header';
import { Card, CardBody } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { NewCustomerForm } from './new-customer-form';
import { BookingForm } from './booking-form';

export const metadata = { title: 'New order — SolveX Admin' };

function todayDhaka(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
}

function Shell({ subtitle, children }: { subtitle?: string; children: React.ReactNode }) {
  return (
    <>
      <Topbar breadcrumb={['Admin', 'Orders', 'New order']} />
      <main className="flex-1 p-6">
        <PageHeader title="New order" subtitle={subtitle} />
        <Card>
          <CardBody>{children}</CardBody>
        </Card>
      </main>
    </>
  );
}

export default async function NewOrderPage({ searchParams }: PageProps<'/admin/orders/new'>) {
  await requireView('orders');
  const sp = await searchParams;
  const phoneParam = (Array.isArray(sp.phone) ? sp.phone[0] : sp.phone) ?? '';
  const userIdParam = Array.isArray(sp.userId) ? sp.userId[0] : sp.userId;
  const d = db();

  if (userIdParam) {
    const [profile] = await d
      .select({ fullName: schema.profiles.fullName })
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, userIdParam))
      .limit(1);

    if (!profile) {
      return (
        <Shell>
          <p className="text-[13px] text-[var(--color-muted)]">
            That customer no longer exists.{' '}
            <Link href="/admin/orders/new" className="text-[var(--color-primary)] hover:underline">
              Start over
            </Link>
            .
          </p>
        </Shell>
      );
    }

    const today = todayDhaka();
    const [catalog, availability, creditBalance] = await Promise.all([
      getBookingCatalog(d),
      getAvailability(d, today),
      getCreditBalance(d, userIdParam),
    ]);

    return (
      <Shell subtitle={profile.fullName}>
        <BookingForm
          userId={userIdParam}
          catalog={catalog}
          creditBalance={creditBalance}
          initialAvailability={availability}
          initialDate={today}
        />
      </Shell>
    );
  }

  if (phoneParam) {
    const normalized = normaliseBdMobile(phoneParam);

    if (normalized) {
      const match = await findProfileByPhone(d, normalized);
      if (match) {
        return (
          <Shell>
            <div className="flex flex-col gap-4">
              <p className="text-[13px] text-[var(--color-text)]">
                Found an existing customer: <strong>{match.fullName}</strong>
              </p>
              <div className="flex gap-2">
                <Button asChild>
                  <Link href={`/admin/orders/new?userId=${match.userId}`}>Continue</Link>
                </Button>
                <Button variant="secondary" asChild>
                  <Link href="/admin/orders/new">Search again</Link>
                </Button>
              </div>
            </div>
          </Shell>
        );
      }

      const geography = await getGeography(d);
      return (
        <Shell subtitle="No customer found for that number — create one.">
          <NewCustomerForm phone={normalized} geography={geography} />
        </Shell>
      );
    }
  }

  return (
    <Shell>
      <form method="get" className="flex flex-col gap-4">
        <Field
          label="Customer phone number"
          htmlFor="phone"
          error={phoneParam ? 'Enter a valid Bangladeshi mobile number.' : undefined}
        >
          <Input id="phone" name="phone" type="tel" required placeholder="01712345678" defaultValue={phoneParam} />
        </Field>
        <div className="flex justify-end">
          <Button type="submit">Find customer</Button>
        </div>
      </form>
    </Shell>
  );
}
```

- [ ] **Step 4: Typecheck and lint**

Run: `cd solvex-cms && npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add solvex-cms/src/app/admin/orders/new/page.tsx \
  solvex-cms/src/app/admin/orders/new/new-customer-form.tsx \
  solvex-cms/src/app/admin/orders/new/booking-form.tsx
git commit -m "feat(cms): add the /admin/orders/new wizard page"
```

---

### Task 10: Entry points on the Orders and Customers pages

**Files:**
- Modify: `solvex-cms/src/app/admin/orders/page.tsx`
- Modify: `solvex-cms/src/app/admin/customers/page.tsx`

- [ ] **Step 1: Add a "New order" button to the Orders page**

In `solvex-cms/src/app/admin/orders/page.tsx`, add `Link` and `Button` imports (the file already imports `Link` at line 1 — confirm before adding a duplicate; add `Button` alongside the existing `@/components/ui/*` imports):

```ts
import { Button } from '@/components/ui/button';
```

Change the `<PageHeader ... />` call (currently lines 77–80):

```tsx
        <PageHeader
          title="Orders"
          subtitle={`${rows.length} shown · ${byStatus.get('PENDING') ?? 0} awaiting approval`}
        />
```

to:

```tsx
        <PageHeader
          title="Orders"
          subtitle={`${rows.length} shown · ${byStatus.get('PENDING') ?? 0} awaiting approval`}
          actions={
            <Button asChild>
              <Link href="/admin/orders/new">New order</Link>
            </Button>
          }
        />
```

- [ ] **Step 2: Add a "New order" link per row on the Customers page**

In `solvex-cms/src/app/admin/customers/page.tsx`, change the header row (currently lines 125–134):

```tsx
                <tr>
                  <Th>Customer</Th>
                  <Th>Contact</Th>
                  <Th>Area</Th>
                  <Th>Orders</Th>
                  <Th>Collected</Th>
                  <Th>Credit</Th>
                  <Th>Referrals</Th>
                  <Th>Joined</Th>
                </tr>
```

to:

```tsx
                <tr>
                  <Th>Customer</Th>
                  <Th>Contact</Th>
                  <Th>Area</Th>
                  <Th>Orders</Th>
                  <Th>Collected</Th>
                  <Th>Credit</Th>
                  <Th>Referrals</Th>
                  <Th>Joined</Th>
                  <Th />
                </tr>
```

Change the closing of each body row (currently lines 191–194):

```tsx
                    <Td className="whitespace-nowrap text-xs text-[var(--color-muted)]">
                      {formatDate(row.createdAt.toISOString().slice(0, 10))}
                    </Td>
                  </Tr>
```

to:

```tsx
                    <Td className="whitespace-nowrap text-xs text-[var(--color-muted)]">
                      {formatDate(row.createdAt.toISOString().slice(0, 10))}
                    </Td>
                    <Td>
                      <Link
                        href={`/admin/orders/new?userId=${row.userId}`}
                        className="text-[var(--color-primary)] hover:underline"
                      >
                        New order
                      </Link>
                    </Td>
                  </Tr>
```

Also update the `EmptyRow colSpan={8}` (currently line 138) to `colSpan={9}`, since a ninth column was added.

- [ ] **Step 3: Typecheck, lint, and check the guard/audit tests are unaffected**

Run: `cd solvex-cms && npm run typecheck && npm run lint`
Run: `cd solvex-cms && npx vitest run src/lib/action-guards.test.ts`
Expected: all pass (these two page files export no server actions, so the guard test is unaffected by this task; it is re-run here only as a cheap regression check).

- [ ] **Step 4: Commit**

```bash
git add solvex-cms/src/app/admin/orders/page.tsx solvex-cms/src/app/admin/customers/page.tsx
git commit -m "feat(cms): link to the new-order wizard from Orders and Customers"
```

---

### Task 11: End-to-end verification (local dev, browser-driven)

**Files:** none — this task drives the already-running local dev servers (webapp on :3000, CMS on :3001, per this session's established setup) through a browser and confirms behavior directly in the local D1 database. No code changes.

- [ ] **Step 1: Full regression pass**

Run, from the repo root:
```bash
npm run typecheck
npm run lint --workspaces --if-present
npm test
```
Expected: all green, including the two guard/audit test files and every `packages/db` test file (`phone.test.ts`, `walkin.test.ts`, `place-order.test.ts`, plus everything already passing before this plan).

- [ ] **Step 2: Existing-customer flow**

In the CMS (logged in as `admin@solvex.local`), open `/admin/orders/new`, enter the phone number of a real customer already in the local DB (e.g. the one created earlier this session while testing the geography picker), confirm the match screen shows their name, click Continue, place an order with a real service/date/slot. Confirm it appears on `/admin/orders` and that the order's detail page (`/admin/orders/[id]`) shows an event trail whose initial `PENDING` entry is attributed to the admin (query directly if the UI does not surface `adminId`: `sqlite3 <db file> "SELECT status, admin_id FROM order_events WHERE order_id = <id>;"`).

- [ ] **Step 3: Walk-in flow with a custom price**

From `/admin/orders/new`, enter a phone number with no existing match (e.g. `01799912345`). Confirm the "New customer" form appears, fill it in with a Zone/Area/Location pick, submit, confirm it lands on the booking step. Place an order with a value in "Custom price" different from the catalog price. Confirm via `sqlite3` that `orders.base_price` and `orders.total` equal the custom value, and that `user.email` for that customer matches `<phone>@walkin.solvex.local`.

- [ ] **Step 4: The merge**

On the webapp (`http://localhost:3000`), sign up for a new account and, at `/profile/complete`, enter the same phone number used in Step 3. Submit. Confirm via `sqlite3`:
```sql
SELECT id, email FROM user WHERE email LIKE '%@walkin.solvex.local';
```
returns no row for that phone anymore, and:
```sql
SELECT o.code, o.user_id FROM orders o WHERE o.user_id = '<the new real user id>';
```
includes the order placed in Step 3.

- [ ] **Step 5: Report**

Summarize pass/fail for each of Steps 2–4 back to the user. Do not deploy — this plan's verification is local-only per the project's standing no-deploy-without-permission rule.
