# Employee Accounts & Permissions — Implementation Plan

**Date:** 2026-07-30
**Status:** Awaiting approval

**Goal:** Let an admin onboard back-office employees who log in to the CMS, and control exactly which areas each one can see or change.

**Decisions taken:**
- Access is a **module × level grid** (None / View / Manage) with role presets.
- New employees get an **admin-set temporary password**, forced to change on first login. No email dependency.
- **Technicians stay separate** — they remain operational records with no login.

---

## 1. What changes conceptually

Today the CMS has one kind of user: an admin who can do everything. `requireAdmin()`
guards every page and every server action, and answers only "are you signed in?".

After this, every back-office user is an **employee** with a permission set.
"Admin" becomes the preset that happens to grant Manage everywhere. There is no
separate admin table — the existing `admin_user` rows become employees, and the
seeded account becomes the first Owner.

---

## 2. Permission model

### 2.1 Modules

Seven, matching the existing sidebar:

| Module | Covers |
|---|---|
| `orders` | Order list and detail, status transitions, technician assignment |
| `catalog` | Categories, services, content, variables, pricing, images |
| `technicians` | Technician directory and rota |
| `customers` | Customer list and detail |
| `referrals` | Referral report |
| `analytics` | Dashboard |
| `settings` | Areas, slots, global settings, **and employees** |

### 2.2 Levels

`none` < `view` < `manage`. Ordered, so a check is a comparison rather than a set
lookup — `manage` implies `view`.

- **none** — the module is invisible: hidden from the nav, and its routes 404.
- **view** — read-only. Lists and detail pages render; every mutating action is refused.
- **manage** — full control of that module.

### 2.3 Why not finer

Splitting `orders` into "change status" and "assign technician" was considered and
rejected: it doubles the grid for a distinction no real role wants. If that need
appears, a level can be added between view and manage without changing the shape.

### 2.4 Owner flag

Separate from the grid. An **Owner** implicitly has `manage` everywhere and is the
only role that can edit employees' permissions. This is what prevents a Manager
from granting themselves Settings and escalating.

### 2.5 Presets

Convenience only — a preset writes ordinary grid values that can then be adjusted.

| Preset | orders | catalog | technicians | customers | referrals | analytics | settings |
|---|---|---|---|---|---|---|---|
| Owner | manage | manage | manage | manage | manage | manage | manage |
| Manager | manage | manage | manage | view | view | view | none |
| Dispatcher | manage | view | view | view | none | none | none |
| Support | view | view | none | view | view | none | none |
| Catalog editor | none | manage | none | none | none | none | none |

---

## 3. Data model

```
admin_user  (existing table, extended)
  + is_owner        integer boolean, default false
  + active          integer boolean, default true
  + must_change_password integer boolean, default false
  + created_by      text, nullable        -- which employee onboarded them
  + last_login_at   integer timestamp_ms, nullable

admin_permissions                          -- new
  admin_user_id   text     -> admin_user.id, cascade
  module          text     -- 'orders' | 'catalog' | ...
  level           text     -- 'none' | 'view' | 'manage'
  PRIMARY KEY (admin_user_id, module)

admin_audit                                -- new
  id, actor_id, action, subject_id, detail, created_at
```

All additive — new tables plus `ALTER TABLE ADD COLUMN`. No rebuild of
`admin_user`, so none of the D1 rebuild hazards from earlier phases apply.

**`admin_audit` is not optional.** Permission changes and account
activation/deactivation are exactly the events you need a record of when
something goes wrong, and there is nowhere else they are captured.

---

## 4. Enforcement

This is the security-critical part and the bulk of the work.

### 4.1 The technique that makes it safe

`requireAdmin()` is **deleted**, not extended. Every one of its **44 call sites**
stops compiling and must be revisited deliberately. A permission model added
alongside the old helper would leave silently-unguarded actions behind, and those
are invisible until someone finds them.

Replacements:

```ts
requireView(module)    // page-level; 404s rather than redirects, so a hidden
                       // module does not confirm it exists
requireManage(module)  // every mutating server action
requireOwner()         // employee management only
```

Each returns the employee, so actions still get `admin.id` for audit rows.

### 4.2 Where checks go

- **Page** — `requireView` at the top of every `/admin/*` page.
- **Server action** — `requireManage` at the top of every action. This is the real
  boundary: a server action is a POST endpoint reachable directly, so hiding a
  button proves nothing.
- **Navigation** — the sidebar renders only permitted modules. Cosmetic, not a control.

### 4.3 Session freshness

Permissions are read per request from the database, never baked into the session
cookie. Revoking access takes effect on the next request rather than when a
session happens to expire. Deactivating an employee blocks at the same point.

---

## 5. Onboarding flow

1. Owner opens **Settings → Employees → Add employee**.
2. Enters name, email, a preset (or a custom grid), and a temporary password.
3. Account is created with `must_change_password = true`.
4. Owner passes the password to the employee out of band.
5. On first sign-in the employee is redirected to **Change password** and cannot
   reach any other route until it is done.
6. `must_change_password` clears; `last_login_at` records the first use.

### 5.1 The risk this carries, stated plainly

A temporary password travels over WhatsApp, SMS or speech. That is weaker than an
emailed invite link, and it was chosen knowingly. Three mitigations, all cheap:

- **Minimum 12 characters**, and the form offers a generated one.
- **The forced change is enforced server-side**, not by redirect alone — every
  guard refuses while `must_change_password` is true, so a bookmarked URL cannot
  skip it.
- **Temporary passwords expire.** If the account has never been used within 7
  days, sign-in is refused and the Owner must set a new one. A password shared in
  a chat thread should not stay valid indefinitely.

Adding emailed invites later needs only the email module and a token table; the
account model does not change.

---

## 6. Safety rails

These are the failure modes worth engineering against:

| Risk | Guard |
|---|---|
| Locking everyone out | The last active Owner cannot be deactivated or demoted. Enforced in the action against a live count, not in the UI. |
| Self-escalation | Only an Owner can edit permissions, and **nobody can edit their own** — including Owners. A second Owner is required to change an Owner. |
| Self-lockout | An Owner cannot deactivate their own account. |
| Orphaned audit trail | `order_events.admin_id` already records who acted. Employees are deactivated, never deleted, so history stays attributable. |
| Stale sessions after revocation | Permissions read per request (§4.3). |

---

## 7. UI surfaces

**New**

- `/admin/employees` — list: name, email, role summary, status, last login. Owner only.
- `/admin/employees/[id]` — permission grid, activate/deactivate, reset temporary password.
- `/admin/change-password` — forced first-login screen, and voluntary change.

**Changed**

- Sidebar filters to permitted modules.
- Every `/admin/*` page gains `requireView`.
- Every server action gains `requireManage`.
- Read-only mode: at `view`, mutating controls are not rendered and the page says
  why, rather than showing buttons that will be refused.

---

## 8. Testing

In `packages/db`, against real D1 — this is authorisation, so it gets the same
treatment as the money paths:

1. Level comparison: `manage` satisfies a `view` requirement; `view` does not satisfy `manage`; `none` satisfies nothing.
2. Owner bypasses the grid entirely.
3. The last active Owner cannot be deactivated or demoted — including under two concurrent attempts, where exactly one must fail.
4. Nobody can edit their own permissions.
5. A revoked permission takes effect on the next request without re-login.
6. An unused temporary password expires after 7 days.
7. `must_change_password` blocks every guarded route, not just the redirect path.

Plus one repo-wide check that is easy to forget and cheap to keep: **every
exported server action in `solvex-cms` calls a permission guard.** A test that
greps the action files and fails on any missing guard catches the one action
someone adds later without thinking.

---

## 9. Size of the sweep

Measured, not estimated:

| | Count |
|---|---|
| `requireAdmin()` call sites | 44 |
| Modules marked `'use server'` | 12 |
| Exported server actions | 32 |
| Admin pages | 12 |

Every one of those 32 actions needs a `requireManage`, and every one of the 12
pages a `requireView`. That is the work.

---

## 9. Task breakdown

| # | Task | Deliverable |
|---|---|---|
| 1 | Schema + migration | New columns and tables, applied locally and remotely |
| 2 | Permission core in `packages/db` | Level comparison, grid read/write, presets, guards' data layer, tests 1–2 |
| 3 | Safety rails | Last-owner and self-edit rules, tests 3–4 |
| 4 | Session guards in CMS | `requireView` / `requireManage` / `requireOwner`; delete `requireAdmin` |
| 5 | Sweep every page and action | 44 call sites across 12 admin pages and 32 exported server actions; the grep test from §8 |
| 6 | Employees UI | List, detail grid, presets, activate/deactivate |
| 7 | Password flows | Temporary password, forced change, expiry, tests 6–7 |
| 8 | Read-only mode | Hide mutating controls at `view` |
| 9 | Migrate existing admin | Seeded account becomes Owner; backfill grid rows |
| 10 | Audit log | Record permission and status changes, surface on the employee page |

Tasks 4 and 5 are the risky ones and should land together: between deleting
`requireAdmin` and finishing the sweep, the CMS does not compile, which is the
point.

---

## 10. What this does not include

- No emailed invites (chosen: temporary passwords). Adding them later is additive.
- No admin password *reset* by email — still missing, still needs the email module
  moved into a shared package. Task 7 gives Owners a way to reset another
  employee's password, which covers the common case but **not a locked-out sole Owner**.
- No technician logins.
- No per-record scoping ("only orders in my area"). The grid is module-wide.
- No 2FA.

---

## 11. Open question for you

**A sole Owner who forgets their password is still locked out**, because the only
recovery path is another Owner. Options: create a second Owner account on day one
as a break-glass, or build email-based reset. The plan assumes the former; say if
you want the latter and it becomes part of this work.
