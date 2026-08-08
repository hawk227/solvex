# AC service catalog import (Solvex-branded, from source reference doc)

## Problem

The `air-conditioner` category currently has 3 placeholder demo services
(AC Cleaning, AC Health Checkup, AC Gas Refill) from `demo-data.sql`. A
16-entry AC service reference document (Sheba.xyz's own price/cost sheet)
gives Solvex a real, detailed catalog to replace it with — full pricing,
customer-facing scope (included/excluded), FAQs, and internal
delivery-costing data (material, tools, technician count, resource cost,
service time, travel cost, internal cost) that today's schema has no column
for.

## Non-goals

- No pricing engine changes. Every service here is a flat price (no
  variable groups/options) — the doc has no tiered pricing.
- No new category. `air-conditioner` already exists and fits.
- No UI changes to the customer-facing site's service cards or booking flow
  — this is catalog content, not a new feature surface. The existing
  service detail page and booking form already render whatever's in
  `services`/`servicePrices`/`variableGroups` correctly.
- No deletion. The 3 existing demo services are deactivated, not dropped —
  consistent with this project's soft-delete convention (orders/tickets/
  audit trail may still reference them).
- No production write without a separate explicit confirmation, same as
  every other production data change this session.

## Schema

One new table, `service_costing`, 1:1 with `services`:

```ts
export const serviceCosting = sqliteTable('service_costing', {
  serviceId: integer('service_id')
    .primaryKey()
    .references(() => services.id, { onDelete: 'cascade' }),
  material: text('material'),
  tools: text('tools'),
  // Text, not integer: the source doc has ranges ("2/3"), not just counts.
  resourceCount: text('resource_count'),
  resourceCost: integer('resource_cost'),
  // The doc's raw string ("1.30 H", "6 to 24 H", "30 min") preserved
  // exactly — some are ranges that don't reduce to one number. Where a
  // clean single value exists, it's ALSO written to services.durationMin
  // (already-existing column) so nothing that reads duration today breaks.
  serviceTimeLabel: text('service_time_label'),
  travelCost: integer('travel_cost'),
  // What it costs Solvex to deliver — distinct from services.price /
  // service_prices.price, which is what the customer pays. Never shown to
  // customers; CMS-only, same trust boundary as any other admin-only field.
  internalCost: integer('internal_cost'),
  // Technician-facing step-by-step instructions. Null for every service
  // except Power Consumption Check-up, which is the only one the source
  // doc gives a completion checklist for.
  sopMd: text('sop_md'),
});
```

Purely additive — one `CREATE TABLE`, no changes to `services` or
`service_prices` (the tables the live booking/pricing code already reads).
`onDelete: 'cascade'` matches `variableGroups`' relationship to `services`.

## Content mapping

Source document → schema, per service. `Price` → `services.price` via a
`service_prices` row with `comboKey = ''` (flat price, no variables).
`Details:` paragraph → `services.aboutMd`. `Included in the Service` list →
`services.includedJson`. `Excluded from the Service` list →
`services.notIncludedJson`. `Frequently Asked Questions` → `services.faqsJson`.
Every "Sheba.xyz" in source text is written as "Solvex" — authored correctly,
not substituted after the fact. `Service time` → `service_costing.serviceTimeLabel`
verbatim, plus `services.durationMin` where a single clean number exists.

| # | Name | Slug | Price | Cost | Duration (min) | Priced? |
|---|---|---|---|---|---|---|
| 1 | AC Basic Service | `ac-basic-service` | 599 | 550 | 30 | yes |
| 2 | Power Consumption Check-up | `ac-power-consumption-checkup` | 599 | 450 | 30 | yes |
| 3 | AC Jet Wash | `ac-jet-wash` | 1200 | 650 | 90 | yes |
| 4 | AC Master Service | `ac-master-service` | 1700 | 700 | 120 | yes |
| 5 | AC Hydro Wash | `ac-hydro-wash` | 1400 | 650 | 90 | yes |
| 6 | AC Water Drop Solution | `ac-water-drop-solution` | 1100 | 550 | 60 | yes |
| 7 | AC Gas Charge | `ac-gas-charge` | 2690 | 1600 | 60 | yes |
| 8 | AC Leak Repair | `ac-leak-repair` | 2900 | 750 | null (48 H, a multi-day repair — left in `serviceTimeLabel` only) | yes |
| 9 | AC Circuit Repair or Replacement | `ac-circuit-repair-replacement` | 3000 | 550 | null (6–24 H range — label only) | yes |
| 10 | AC Capacitor Replacement | `ac-capacitor-replacement` | 1100 | 600 | 60 | yes |
| 11 | AC Compressor Fitting With Gas Charge | `ac-compressor-fitting-gas-charge` | 4500 | 1100 | 180 | yes |
| 12 | AC Installation & Uninstallation | `ac-installation-uninstallation` | 2200 | 800 | 240 | yes |
| 13 | AC Installation | `ac-installation` | 1500 | 800 | 120 | yes |
| 14 | AC Uninstallation | `ac-uninstallation` | 800 | 600 | 90 | yes |
| 15 | Corporate AC Service | `ac-corporate-service` | — | — | null | **no** — quote-only, no `service_prices` row |
| 16 | VRF AC Inspection | `ac-vrf-inspection` | — | — | null | **no** — quote-only, no `service_prices` row |

`resourceCount`/`resourceCost`/`travelCost`/`material`/`tools` are populated
per-service from the doc's bullet list (e.g. service 6's Material is
`"Gas (1 ton-1000)"`, Tools `"Regular Tool, Gas Meter & Ampere Meter"`).
Not tabulated above for space — the seed file carries the full per-service
values, written directly from the source document already in this
conversation's context.

The "Rules for Completion of Service AC Consumption Power Checkup" 12-step
list (appears twice in the source, identical both times) becomes
`service_costing.sopMd` for service #2 only.

Services 15 and 16 still get full `aboutMd`/`includedJson`/`notIncludedJson`
where the source doc provides it (VRF AC Inspection has a real
included/excluded list; Corporate AC Service's "Our Service List" becomes
its `aboutMd` body, since it's a summary of the other 11 service types
rather than a scoped list of its own).

## CMS changes

New "Costing" tab on the service detail page
(`solvex-cms/src/app/admin/services/[id]/page.tsx`), sibling to the existing
Content/Variables/Price Matrix tabs, following the exact pattern of
`content-editor.tsx` (client component + one server action + `Field`/`Input`/
`Textarea`): one form with Material, Tools, Resource count, Resource cost,
Service time label, Travel cost, Internal cost, and SOP (markdown textarea).
A new `updateServiceCosting` action in the existing `services/actions.ts`,
gated by `requireManage('catalog')` (matching every other service-mutating
action in that file), audited the same way.

`internalCost` and `sopMd` are never read by any customer-facing query —
`solvex-webapp`'s `getServiceBySlug`/`getServices` (in `lib/catalog.ts`)
continue selecting only the columns they already do; `service_costing` is
never joined into the public site. The CMS admin page reads it directly,
same trust boundary as everything else already admin-only in that app.

## Seed + rollout

One idempotent SQL file, `packages/db/src/ac-services-seed.sql`, following
`geography-seed.sql`'s convention: upsert by `slug` for services (`INSERT
... WHERE NOT EXISTS` + an always-run `UPDATE`, same pattern used there),
insert-or-replace for the 1:1 `service_costing` rows keyed by the resolved
`service_id`. The 3 demo services get one `UPDATE services SET active = 0
WHERE slug IN (...)` statement.

Applied to local dev first via `wrangler d1 execute --local`, verified in
the CMS and on the public site, then — as its own explicit ask, same as
today's geography rollout — applied to the remote database.

## Testing

No new automated test — this is a data-content change, not new logic
(`service_costing`'s only consumer is a CMS form following an established
pattern already covered by that pattern's own conventions, and the seed SQL
itself has no branching to unit-test). Verified by: `npm run typecheck`
after the schema/migration/action changes, then browsing the local CMS
service list and the public site's AC category page to confirm all 14
priced services render with correct price, content, and the 2 quote-only
services show "Price not set" gracefully (the existing, already-tested
behavior for `fromPrice: null`).
