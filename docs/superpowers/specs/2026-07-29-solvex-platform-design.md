# SolveX Platform — Design Specification

**Date:** 2026-07-29
**Status:** Approved (pending user review of this document)

---

## 1. What we are building

SolveX is a home-appliance service platform for Bangladesh. Customers browse
services (AC cleaning, fridge repair, oven servicing, washer servicing), book a
slot, and pay the technician in cash after the job. Staff run the whole
operation from a separate back-office.

Two products, one repository (`github.com/hawk227/solvex`), two independently
built and independently deployed apps:

| Directory | What it is | Who uses it |
|---|---|---|
| `solvex-webapp/` | Public marketing site + customer account and booking | Customers |
| `solvex-cms/` | Back-office: catalog, orders, users, analytics | Admins |
| `packages/db/` | Shared Drizzle schema + migrations | Both |

Each app has its own `package.json`, its own `wrangler.jsonc`, and its own
Worker. npm workspaces at the root, no Turborepo — two apps and one shared
package do not need a build orchestrator.

---

## 2. Decisions

Every entry here was decided explicitly. Do not revisit without cause.

| Area | Decision |
|---|---|
| Framework | Next.js on Cloudflare Workers via OpenNext, both repos |
| Language | TypeScript, strict mode |
| Styling | Tailwind CSS v4, CSS-variable tokens |
| UI components | Hand-built on Radix UI headless primitives. **No shadcn/ui.** |
| Database | Cloudflare D1, single database shared by both Workers |
| ORM | Drizzle |
| Object storage | Cloudflare R2, public custom domain for reads |
| Auth | Better Auth — separate instances for customers and admins |
| Email | Cloudflare Email Sending, behind a swappable interface |
| Payment | Cash after service. No gateway, no online payment, in any phase. |
| Scheduling | Fixed named slots with per-day capacity. No technician assignment. |
| Pricing | One fixed price per variable-option combination |
| Referral | Real program: codes, attribution, account credit |
| Admin roles | Single admin role. No staff/permission tier. |
| Locale | BDT ৳, Asia/Dhaka, English only. No i18n layer. |
| Static pages | About / Contact / Terms / Privacy live in code, not the CMS |
| Coverage | Admin-managed area list; booking restricted to covered areas |
| Brand primary | `#FF6300` (SolveX orange), tint `#FFBA8E` |

### Explicit non-goals

Not in any phase unless separately specced: online payment, technician
dispatch and assignment, staff permission tiers, Bangla localisation, a
CMS page-builder, native mobile apps, customer-to-admin chat, SMS.

---

## 3. Architecture

### 3.1 Two Workers, one database

Both apps deploy as independent Workers. Both bind the **same** D1 database and
the **same** R2 bucket.

```
                  ┌──────────────────┐
   customers ───► │ solvex-webapp    │ ─┐
                  │ (Worker)         │  │
                  └──────────────────┘  │   ┌─────────────┐
                                        ├──►│ D1: solvex  │
                  ┌──────────────────┐  │   └─────────────┘
   admins ──────► │ solvex-cms       │ ─┘   ┌─────────────┐
                  │ (Worker)         │ ────►│ R2: assets  │
                  └──────────────────┘      └─────────────┘
                                                   │
                                            cdn.solvex.* (public reads)
```

**There is no HTTP API between them.** Each app reads and writes D1 directly
from its own server code (route handlers and server actions). A shared API
service would need its own auth, versioning, deploy target, and failure
modes, and buys nothing — both apps are trusted server code on one account.

### 3.2 Schema ownership

`packages/db` holds the Drizzle schema and every migration. Both apps import it
as a workspace dependency. There is one schema file and one migration ledger.

Rule: migrations are generated and applied only from `packages/db`. Neither app
defines tables of its own. One D1 database with two sources of migrations is
how you get a corrupted migration ledger.

### 3.3 Images

CMS uploads to R2 through its binding. R2 serves reads directly on a public
custom domain. No image-proxy Worker, no signed URLs — these are public
marketing images.

Keys: `categories/{id}/{uuid}.{ext}`, `services/{id}/{uuid}.{ext}`.
Uploads are validated server-side for MIME type and size before hitting R2.

### 3.4 Email

All sending goes through one module (`lib/email.ts`) exposing
`sendEmail({ to, subject, html })`. Cloudflare Email Sending is the
implementation. Swapping to Resend must be a one-file change.

**Risk:** Cloudflare Email Sending is the newest component in this stack. If
OTP mail lands in spam, signup silently dies and nothing on our side reports
it. Deliverability to Gmail and Outlook must be verified before Phase 3 ships.

---

## 4. Data model

Better Auth generates its own tables. Customer tables and admin tables are
separate table sets in the same D1 database.

```
── Auth ────────────────────────────────────────────────────────────
user, session, account, verification            customers (webapp)
admin_user, admin_session, ...                  admins (cms)

── Customer ────────────────────────────────────────────────────────
profile            user_id PK, full_name, phone, address, area_id,
                   referral_code UNIQUE, created_at
areas              id, name, active, sort

── Catalog ─────────────────────────────────────────────────────────
categories         id, slug UNIQUE, name, description, image_key,
                   sort, active
services           id, category_id, slug, name, short_desc, image_key,
                   duration_min, sort, active,
                   about_md, included_json, not_included_json, faqs_json
variable_groups    id, service_id, name, sort            "AC Size"
variable_options   id, group_id, label, sort             "1.5 Ton"
service_prices     id, service_id, combo_key, price      one per combination

── Scheduling ──────────────────────────────────────────────────────
slot_templates     id, label, start_time, end_time, sort, active
slot_capacity      date, slot_id, capacity               override rows only

── Orders ──────────────────────────────────────────────────────────
orders             id, code UNIQUE, user_id, service_id, combo_key,
                   base_price, credit_applied, total,
                   scheduled_date, slot_id,
                   area_id, address_snapshot, phone_snapshot, name_snapshot,
                   notes, status, created_at
order_events       id, order_id, status, note, admin_id, created_at

── Referral ────────────────────────────────────────────────────────
referrals          id, referrer_user_id, referee_user_id, order_id,
                   status, created_at
credit_ledger      id, user_id, delta, reason, order_id, created_at

── Misc ────────────────────────────────────────────────────────────
settings           key PK, value
```

### 4.1 Modelling notes

**Service content is JSON columns, not a block table.** `about_md`,
`included_json`, `not_included_json`, `faqs_json` are four fixed sections that
render as one page and are edited in one form. A generic block system for four
known sections is machinery with no payload.

**Order snapshots address, phone, and name.** These are copied onto the order
at placement, never joined from `profile`. A customer editing their address
must not rewrite the record of where a technician was already sent.

**`credit_ledger` is append-only.** Balance is `SUM(delta) WHERE user_id = ?`.
There is no cached balance column, so there is nothing to drift out of sync.

**`slot_capacity` holds override rows only.** Absent row means the default
capacity from `settings`. Avoids pre-generating a row per day forever.

**`combo_key`** is the service's selected `variable_option` ids, sorted
ascending, joined by `-`. A service with no variables uses the empty string.
Sorting is what makes the key stable regardless of selection order.

---

## 5. Pricing

Each service defines zero or more `variable_groups`, each with two or more
`variable_options`. Every full combination gets one `service_prices` row.

A service with two groups of four options needs 16 rows. Three groups of four
needs 64. **The admin UI must generate the matrix and offer bulk-fill** — set
one price for all rows, then override the outliers. Without bulk-fill this
model is unusable at the second variable group, and this was accepted on the
understanding that bulk-fill ships with it.

Lookup at booking: build `combo_key` from the customer's selections, select the
matching row. A missing row is a data error — the service must not be bookable
until its matrix is complete, and the CMS must show which combinations are
unpriced.

---

## 6. Booking flow

```
service page → select variable options → price appears
             → pick date → pick slot (full slots disabled)
             → confirm address (prefilled from profile, editable)
             → apply account credit (optional)
             → place order
```

Order total: `total = base_price − credit_applied`, where `credit_applied` is
capped at both the customer's balance and `base_price`. The technician collects
`total` in cash.

**Capacity is enforced inside the insert transaction.** The booked count for
`(date, slot_id)` is compared against the override or default capacity at write
time. A client-side or pre-check-only guard loses the race between two
customers booking the last slot simultaneously.

### 6.1 Order status

```
PENDING → APPROVED → ON_THE_WAY → IN_PROGRESS → COMPLETED
                                                CANCELLED (from any non-terminal state)
```

Every transition writes an `order_events` row. The customer's tracking page is
that table rendered as a timeline — there is no second source of truth for
"where is my order".

---

## 7. Referral program

1. Signup accepts `?ref=CODE`. A `referrals` row is created linking referrer
   and referee at signup time.
2. When the **referee's first order reaches `COMPLETED`**, the referrer is
   credited: one `credit_ledger` row, amount from `settings`.
3. The referral row moves to a terminal state in the same transaction, so the
   payout can fire exactly once even if the order re-enters `COMPLETED`.
4. Credit is spent at checkout as `credit_applied`, recorded as a negative
   ledger row referencing the order.

Self-referral (referrer and referee are the same user) is rejected at signup.

---

## 8. Auth

**Customers** (`solvex-webapp`): Better Auth, email + password. On signup an
OTP is emailed; the account is unverified until the OTP is confirmed. After
verification the customer must complete the profile form (name, phone,
address, area) before any booking route is reachable. This gate is enforced
server-side, not just by redirecting in the client.

**Admins** (`solvex-cms`): separate Better Auth instance, separate tables. No
public signup. The first admin is seeded by script; further admins are invited
by an existing admin. Single role — everyone who can log in can do everything.

---

## 9. UI

### 9.1 CMS — clone of the RedeemX back-office

Measured from the reference implementation, with SolveX orange substituted for
its green:

| Element | Spec |
|---|---|
| Font | Inter |
| Sidebar | 262px fixed; brand block; uppercase section label; icon+label rows; active row = tinted pill in primary; user block, change password, logout pinned bottom |
| Topbar | 56px, breadcrumb left, role badge + avatar right, bottom border |
| Page header | H1 32px/700, muted subline with inline stats, actions right-aligned |
| Primary button | h 36px, radius 14px, 13px/500, primary fill |
| Input | h 38px, radius 14px, 13px, tinted fill, transparent border |
| Card | white, radius 10px, subtle border |
| Table header | 11px, uppercase, weight 500, muted |
| Table row | separator border, status shown as dot + label badge |
| Filter bar | card containing search with leading icon, select, export; status chip row with counts, active chip dark-filled |
| Modal | centered ~520px, title + description, stacked label/field, full-width primary submit |
| Base radius token | 10px |

The CMS is desktop-only and intentionally dense. Its 36px controls override
the 44px minimum in `claude-code-design-system.md`; they clear WCAG 2.2 AA's
24×24 target minimum, and the 44px rule is a touch-target rule that remains
binding on the customer-facing webapp.

### 9.2 Webapp

Design not yet supplied. Phase 2 builds against
`claude-code-design-system.md` — mobile-first, 44px targets, 16px body, one H1
per page, 70ch text width — and is restyled when the design arrives.

### 9.3 Token discipline

Because the webapp design is arriving after the code, **no visual value may be
hardcoded anywhere.** Colors, spacing, radii, type sizes, and shadows come from
CSS variables, and every screen is composed from a shared primitive set. A
restyle must be a token-file edit plus a handful of component files, not a
sweep across every page.

Both apps share one color palette rooted at `#FF6300`. Density and spacing
scales differ per app, per 9.1 and 9.2.

### 9.4 Components

Built in-house on Radix UI headless primitives: Dialog, Dropdown Menu, Select,
Tabs, Tooltip, Popover, Switch, Accordion. Radix supplies focus trapping,
keyboard navigation, ARIA wiring, and portal behaviour; all styling is ours.
shadcn/ui is not used, and its components are not copied in.

Every interactive component defines default, hover, active, focus-visible,
disabled, and loading states.

---

## 10. Testing

Vitest with `@cloudflare/vitest-pool-workers`, running against a real local D1.

Mandatory coverage — the logic that costs money when it breaks:

1. **Combination price lookup** — `combo_key` construction is order-independent; a missing combination is rejected rather than defaulting to a price.
2. **Slot capacity** — concurrent bookings for the last slot: exactly one succeeds.
3. **Credit application** — capped at balance and at order total; never negative; ledger sums to the expected balance.
4. **Referral payout** — fires exactly once, only on the referee's first completed order, never for self-referral.

No end-to-end browser tests in v1.

---

## 11. Build order

Each phase gets its own implementation plan. This spec covers all six so the
schema is correct on day one; only Phase 1 proceeds to planning next.

| # | Phase | Contents |
|---|---|---|
| 0 | Foundation | Workspace root, `packages/db` with full schema + migrations, D1 + R2 provisioned, shared token file, seed script |
| 1 | CMS | App scaffold, admin auth, app shell (sidebar/topbar), categories & services CRUD, service content editor, variable groups/options, price matrix with bulk-fill, R2 image upload, areas, slot templates & capacity, settings |
| 2 | Webapp public | Repo scaffold, shared tokens, home, services listing, service detail, about, contact, referral, terms, privacy |
| 3 | Webapp auth | Signup, email OTP, login, password reset, profile form and its server-side gate |
| 4 | Booking | Variable selection, price display, date/slot picker with capacity, address confirm, order placement, customer order list and tracking timeline, CMS orders list and status transitions |
| 5 | Referral | Code generation, `?ref=` attribution, payout on first completed order, credit application at checkout, customer referral dashboard, CMS referral report |
| 6 | Analytics | CMS dashboard: orders over time, revenue, category/service breakdown, customer growth, slot utilisation |

Phase 1 is first because the webapp has nothing to render until a catalog
exists. Phase 6 is last because a dashboard built before real orders exist is a
dashboard built against guesses.

---

## 12. Open risks

| Risk | Mitigation |
|---|---|
| Cloudflare Email Sending deliverability on OTP | Swappable email interface; verify Gmail/Outlook inbox placement before Phase 3 ships |
| Price matrix explodes past two variable groups | Bulk-fill in admin UI is mandatory, not optional; CMS surfaces unpriced combinations |
| Webapp design arrives after the code is written | Strict token discipline and a shared primitive set (§9.3) |
| Two apps, one D1 | `packages/db` is the sole owner of schema and migrations; neither app defines tables |
| Public GitHub repo | No secrets committed. Local secrets in gitignored `.dev.vars`; deployed secrets via `wrangler secret put`. |
| No technician assignment | Accepted for v1. Dispatch is a separate spec if operations outgrow status-only tracking. |
