# CMS order creation, walk-in customers, and account merge

## Problem

Staff need to place an order from the CMS on a customer's behalf (phone orders).
Two things fall out of that requirement:

1. Not every phone caller has a website account. Staff need to create a minimal
   customer record on the spot ("walk-in customer") without going through
   email/OTP signup.
2. If that same person later signs up for real on the website with the same
   phone number, their walk-in order history should end up on the one real
   account, not stranded on a throwaway one.

Staff also need to quote a custom price for a negotiated phone order, which the
existing booking engine does not support (it always prices from the catalog).

## Non-goals

- No customer-facing change. `submitBooking` (webapp) is untouched.
- No general "merge any two accounts" admin tool — only the specific
  walk-in → real-account case triggered by a matching phone number.
- No referral-code handling for walk-in customers. They are never given a
  referral code to share (CMS creates them without exposing one), so a walk-in
  can only ever be a *referee* of nobody — the merge logic does not need to
  touch `referrals`.
- No new "order channel" column. Whether an order was CMS-placed is already
  visible from `order_events.adminId` being set on the initial `PENDING` event.

## Schema impact

None. No migration. Every piece of state this feature needs already has a
column:

- `orders.basePrice` — already free-form; stores the override amount when one
  is used, same as it stores the catalog price otherwise.
- `order_events.adminId` — already nullable text, just never populated at
  order-placement time until now.
- "Walk-in" is not a stored flag. It is derived from the user's email matching
  the synthetic pattern `<phone>@walkin.solvex.local`. This avoids a schema
  change and a migration for a fact that is 100% recoverable from data we
  already control the shape of.
- `orders.userId` and `credit_ledger.userId` are plain `text` columns with **no
  FK constraint** to `user.id` (verified directly in
  `packages/db/src/schema/orders.ts` and `referral.ts`). Merging an account is
  therefore a plain `UPDATE ... SET user_id = ?`, not a cascade operation.

## Shared package changes (`@solvex/db`)

### `packages/db/src/phone.ts` (new — consolidated)

`normaliseBdMobile` currently exists as byte-identical duplicates in
`solvex-webapp/src/lib/phone.ts` and `solvex-cms/src/lib/phone.ts`. Both need
to agree on normalization for phone-based matching to work at all, so this
moves to the shared package as the single source of truth. Its existing test
(`phone.test.ts`) moves with it. Both apps' `lib/phone.ts` are deleted; call
sites import `normaliseBdMobile` from `@solvex/db` instead.

### `packages/db/src/walkin.ts` (new)

```ts
export const WALKIN_EMAIL_DOMAIN = 'walkin.solvex.local';

// Deterministic: same normalized phone always produces the same address, so
// re-running "find or create" for the same caller is naturally idempotent.
export function synthesizeWalkInEmail(normalizedPhone: string): string;

export function isWalkInEmail(email: string): boolean;

// Exact match on normalized phone. Returns the profile + a flag for whether
// it is a walk-in, so callers don't have to re-derive it.
export async function findProfileByPhone(
  db: Db,
  normalizedPhone: string,
): Promise<{ userId: string; fullName: string; isWalkIn: boolean } | null>;

// Moves order + credit-ledger history from a walk-in account onto a real one,
// then deletes the walk-in `user` row (cascades to its `profiles` row — that
// FK has been `onDelete: 'cascade'` since the original CREATE TABLE, so unlike
// the ADD-COLUMN caveat documented elsewhere in this schema, this cascade is
// live and correct).
//
// Returns counts so the caller can audit-log what moved.
export async function mergeWalkInIntoRealAccount(
  db: Db,
  args: { walkInUserId: string; realUserId: string },
): Promise<{ ordersMoved: number; creditRowsMoved: number }>;
```

### `packages/db/src/place-order.ts` (extended)

`PlaceOrderInput` gains two optional fields:

```ts
priceOverride?: number;   // integer BDT taka, >= 0. When set, skips lookupPrice
                          // entirely and uses this as basePrice.
placedByAdminId?: string; // written onto the initial order_events row instead
                          // of null.
```

Nothing else in `placeOrder` branches on these — credit reservation, the
race-safe capacity insert, and the returned `total` all already operate on
`basePrice` as a variable, so override support falls out without duplicating
any of the pricing/capacity logic. `not-priced` simply cannot be returned when
`priceOverride` is set, since `lookupPrice` is never called on that path.

**Trust boundary.** `priceOverride` is only ever set from
`solvex-cms/.../orders/new/actions.ts`, behind `requireManage('orders')`. The
webapp's `submitBooking` action (`solvex-webapp/.../book/[slug]/actions.ts`)
is not modified and never populates this field. This is enforced by
"the client-facing code path simply doesn't set it," not by a runtime check
inside the shared function — `placeOrder` is shared code, and it trusts every
caller's `priceOverride` unconditionally. Any future caller of `placeOrder`
must treat this field as admin-only.

## CMS changes

### `solvex-cms/src/app/admin/orders/new/page.tsx` (new)

A single page, state driven by search params, three states:

1. **No `phone` param** — a phone-entry form.
2. **`?phone=...`, no `userId`** — server looks up
   `findProfileByPhone(db, normalize(phone))`:
   - Match → show name/area/credit-balance summary + "Continue" (link to
     `?userId=<id>`).
   - No match → inline "New customer" form: full name, phone (prefilled,
     read-only), address, Zone/Area/Location picker. Submits to
     `createWalkInCustomer`, which redirects to `?userId=<new id>` on success.
3. **`?userId=...`** — the booking form: service (grouped by category),
   variable options (revealed per selected service, same shape as the webapp
   booking page), date, slot (via `getAvailability`, showing remaining
   capacity), credit-to-apply (if balance > 0), notes, and an optional
   **custom total** field (blank = catalog price). Submits to
   `createOrderForCustomer`.

Reached from: a "New order" button on `/admin/orders`, and a "New order" link
per row on `/admin/customers` (pre-filling `?userId=`).

### `solvex-cms/src/app/admin/orders/new/actions.ts` (new)

- `createWalkInCustomer(formData)` — `requireManage('customers')`. Validates
  name/phone/address/areaId (locationId optional, same nullable-handling as
  the webapp's profile form). Inserts `user` (email =
  `synthesizeWalkInEmail(normalizedPhone)`, `emailVerified: false`, no
  `account`/`session`/`verification` rows — this user cannot log in) and
  `profiles`. Audited as `customer.create-walkin`.

- `createOrderForCustomer(formData)` — `requireManage('orders')`. Validates
  `userId`, service/options, date/slot, `requestedCredit`, `notes`, and an
  optional non-negative-integer `priceOverride`. Calls `placeOrder(db, {
  ...parsed, placedByAdminId: admin.id })`. Same error-message mapping
  pattern as the webapp's `submitBooking` (`MESSAGES` keyed by `reason`).
  Audited as `orders.place` with `detail` including whether an override was
  used and its value.

### `solvex-cms/src/components/ui/address-picker.tsx` (new)

A CMS-side port of `solvex-webapp/src/components/ui/address-picker.tsx` for
the walk-in "new customer" subform. There is no shared UI package between the
two Next apps today (confirmed — each has its own `components/ui`), so this
follows the project's existing precedent (the phone.ts duplication being
undone above is the exception, because that one was normalization *logic*,
not a UI component) of accepting one small duplication rather than introducing
a cross-app package for a single component.

## Webapp changes

### `solvex-webapp/src/app/(app)/profile/complete/actions.ts` (extended)

After the customer's own `profiles` row is created or updated (existing logic,
unchanged), add:

```ts
const existingByPhone = await findProfileByPhone(d, phone);
if (existingByPhone && existingByPhone.userId !== customer.id && existingByPhone.isWalkIn) {
  try {
    const result = await mergeWalkInIntoRealAccount(d, {
      walkInUserId: existingByPhone.userId,
      realUserId: customer.id,
    });
    await audit({
      action: 'profile.merge-walkin',
      targetType: 'profile',
      targetId: customer.id,
      detail: { ordersMoved: result.ordersMoved, creditRowsMoved: result.creditRowsMoved },
    });
  } catch (err) {
    await audit({
      action: 'profile.merge-walkin',
      targetType: 'profile',
      targetId: customer.id,
      outcome: 'ERROR',
      reason: err instanceof Error ? err.message : 'unknown',
    });
  }
}
```

A merge failure is caught and audited, never surfaced to the customer and
never blocks their own profile save — the save already succeeded by the time
this runs.

**Why only when `isWalkIn`:** if the matched phone belongs to another *real*
account (two genuine people sharing a number, or a typo), silently merging
would destroy a stranger's order history. That case is left exactly as it
behaves today (duplicate phones across real accounts are already
unconstrained) — out of scope, not silently "fixed" by this feature.

## Error handling summary

| Situation | Behavior |
|---|---|
| Malformed phone at CMS lookup | Validation error, no query run |
| `placeOrder` reason (`area-unavailable`, `slot-full`, etc.) | Same reason codes as webapp, CMS-appropriate message text |
| `priceOverride` negative or non-integer | Rejected by Zod before reaching `placeOrder` |
| Merge fails during `saveProfile` | Caught, audited as `ERROR`, does not block the profile save |
| Phone matches a real (non-walk-in) account | No merge attempted; today's existing (unconstrained) behavior |

## Testing

- `packages/db/test/walkin.test.ts` (new): `synthesizeWalkInEmail` /
  `isWalkInEmail` round-trip; `findProfileByPhone` normalizes before matching;
  `mergeWalkInIntoRealAccount` moves `orders.userId` and `credit_ledger.userId`
  rows and deletes the walk-in `user` (verify cascade removes its `profiles`
  row too); merging when there is nothing to merge is a safe no-op path (not
  exercised by this function itself — callers check `isWalkIn` first).
- `packages/db/test/place-order.test.ts` (existing, extended): `priceOverride`
  bypasses `lookupPrice` and becomes `basePrice`; `placedByAdminId` lands on
  the initial `order_events` row; omitting both preserves all existing
  behavior byte-for-byte.
- End-to-end, local dev, browser-driven: run the CMS wizard to create a
  walk-in and place an order for them; then sign up on the webapp with the
  same phone and confirm the order and any credit moved, and the walk-in
  account is gone.

## Open assumption carried from the original geography work

Nothing here depends on the zone/area/location work beyond reusing its
`AddressPicker` shape for the CMS's new-customer subform — no coupling beyond
that.
