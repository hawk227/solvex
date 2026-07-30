import { and, eq, ne, sql } from 'drizzle-orm';
import type { Db } from './index';
import { adminUser } from './schema/admin-auth';
import {
  PERMISSION_LEVELS,
  PERMISSION_MODULES,
  adminAudit,
  adminPermissions,
  type PermissionLevel,
  type PermissionModule,
} from './schema/admin-permissions';

/** How long an unused temporary password stays valid. */
export const TEMP_PASSWORD_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const RANK: Record<PermissionLevel, number> = { none: 0, view: 1, manage: 2 };

/** `manage` satisfies `view`; `view` does not satisfy `manage`. */
export function satisfies(held: PermissionLevel, required: PermissionLevel): boolean {
  return RANK[held] >= RANK[required];
}

export type PermissionGrid = Record<PermissionModule, PermissionLevel>;

export function emptyGrid(): PermissionGrid {
  return Object.fromEntries(PERMISSION_MODULES.map((m) => [m, 'none'])) as PermissionGrid;
}

export function fullGrid(): PermissionGrid {
  return Object.fromEntries(PERMISSION_MODULES.map((m) => [m, 'manage'])) as PermissionGrid;
}

/** Presets write ordinary grid values — they are a starting point, not a role. */
export const PRESETS: Record<string, PermissionGrid> = {
  Owner: fullGrid(),
  Manager: {
    orders: 'manage',
    catalog: 'manage',
    technicians: 'manage',
    customers: 'view',
    referrals: 'view',
    analytics: 'view',
    settings: 'none',
  },
  Dispatcher: {
    orders: 'manage',
    catalog: 'view',
    technicians: 'view',
    customers: 'view',
    referrals: 'none',
    analytics: 'none',
    settings: 'none',
  },
  Support: {
    orders: 'view',
    catalog: 'view',
    technicians: 'none',
    customers: 'view',
    referrals: 'view',
    analytics: 'none',
    settings: 'none',
  },
  'Catalog editor': {
    orders: 'none',
    catalog: 'manage',
    technicians: 'none',
    customers: 'none',
    referrals: 'none',
    analytics: 'none',
    settings: 'none',
  },
};

export type Employee = {
  id: string;
  name: string;
  email: string;
  isOwner: boolean;
  active: boolean;
  mustChangePassword: boolean;
  permissions: PermissionGrid;
};

/**
 * Load an employee with their effective permissions.
 *
 * Read per request rather than baked into the session, so revoking access takes
 * effect on the very next request instead of whenever a cookie happens to expire.
 * Owners bypass the grid entirely.
 */
export async function getEmployee(db: Db, id: string): Promise<Employee | null> {
  const [row] = await db
    .select({
      id: adminUser.id,
      name: adminUser.name,
      email: adminUser.email,
      isOwner: adminUser.isOwner,
      active: adminUser.active,
      mustChangePassword: adminUser.mustChangePassword,
    })
    .from(adminUser)
    .where(eq(adminUser.id, id))
    .limit(1);

  if (!row) return null;

  if (row.isOwner) return { ...row, permissions: fullGrid() };

  const grants = await db
    .select({ module: adminPermissions.module, level: adminPermissions.level })
    .from(adminPermissions)
    .where(eq(adminPermissions.adminUserId, id));

  const permissions = emptyGrid();
  for (const g of grants) {
    // A row for a module we no longer recognise is ignored rather than trusted.
    if (PERMISSION_MODULES.includes(g.module)) permissions[g.module] = g.level;
  }

  return { ...row, permissions };
}

export function can(
  employee: Employee,
  module: PermissionModule,
  required: PermissionLevel,
): boolean {
  // An inactive employee holds nothing, whatever the grid says.
  if (!employee.active) return false;
  if (employee.isOwner) return true;
  return satisfies(employee.permissions[module], required);
}

/** Modules the employee can at least see, for building navigation. */
export function visibleModules(employee: Employee): PermissionModule[] {
  return PERMISSION_MODULES.filter((m) => can(employee, m, 'view'));
}

export type PermissionWriteResult =
  | { ok: true }
  | { ok: false; reason: 'self-edit' | 'not-owner' | 'last-owner' | 'not-found' };

/**
 * Confirm the actor is still an active owner *right now*.
 *
 * The caller passes an Employee that was loaded earlier in the request, and in
 * principle could be older than that. Trusting it would let someone demoted or
 * deactivated a moment ago still act with their previous authority, so every
 * privileged write re-reads them.
 */
async function assertActiveOwner(db: Db, actor: Employee): Promise<boolean> {
  const [row] = await db
    .select({ isOwner: adminUser.isOwner, active: adminUser.active })
    .from(adminUser)
    .where(eq(adminUser.id, actor.id))
    .limit(1);
  return Boolean(row?.isOwner && row.active);
}

/** Active owners other than `excludingId`. Used to protect the last one. */
async function otherActiveOwners(db: Db, excludingId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(adminUser)
    .where(and(eq(adminUser.isOwner, true), eq(adminUser.active, true), ne(adminUser.id, excludingId)));
  return Number(row?.n ?? 0);
}

/**
 * Replace an employee's permission grid.
 *
 * Two rules, both enforced here rather than in the UI:
 *  - only an owner may write permissions;
 *  - **nobody may edit their own**, owners included. Without that, any employee
 *    who reaches this code path can grant themselves everything, and the whole
 *    model is decoration.
 */
export async function setPermissions(
  db: Db,
  actor: Employee,
  subjectId: string,
  grid: PermissionGrid,
): Promise<PermissionWriteResult> {
  if (actor.id === subjectId) return { ok: false, reason: 'self-edit' };
  if (!(await assertActiveOwner(db, actor))) return { ok: false, reason: 'not-owner' };

  const subject = await getEmployee(db, subjectId);
  if (!subject) return { ok: false, reason: 'not-found' };

  await db.delete(adminPermissions).where(eq(adminPermissions.adminUserId, subjectId));
  await db.insert(adminPermissions).values(
    PERMISSION_MODULES.map((module) => ({
      adminUserId: subjectId,
      module,
      level: grid[module],
    })),
  );

  await db.insert(adminAudit).values({
    actorId: actor.id,
    action: 'permissions.set',
    subjectId,
    detail: PERMISSION_MODULES.map((m) => `${m}=${grid[m]}`).join(' '),
  });

  return { ok: true };
}

/**
 * Promote or demote an owner.
 *
 * Demoting the last active owner is refused: it would leave nobody able to
 * administer employees, and there is no way back in.
 */
export async function setOwner(
  db: Db,
  actor: Employee,
  subjectId: string,
  isOwner: boolean,
): Promise<PermissionWriteResult> {
  if (actor.id === subjectId) return { ok: false, reason: 'self-edit' };
  if (!(await assertActiveOwner(db, actor))) return { ok: false, reason: 'not-owner' };

  const subject = await getEmployee(db, subjectId);
  if (!subject) return { ok: false, reason: 'not-found' };

  if (!isOwner && subject.isOwner && (await otherActiveOwners(db, subjectId)) === 0) {
    return { ok: false, reason: 'last-owner' };
  }

  // Conditional on the row still being an owner, so two concurrent demotions
  // cannot both pass the count check and remove the last one between them.
  const updated = await db
    .update(adminUser)
    .set({ isOwner })
    .where(and(eq(adminUser.id, subjectId), eq(adminUser.isOwner, subject.isOwner)))
    .returning({ id: adminUser.id });

  if (updated.length === 0) return { ok: false, reason: 'last-owner' };

  await db.insert(adminAudit).values({
    actorId: actor.id,
    action: isOwner ? 'owner.granted' : 'owner.revoked',
    subjectId,
  });

  return { ok: true };
}

/** Activate or deactivate an employee, protecting the last active owner. */
export async function setEmployeeActive(
  db: Db,
  actor: Employee,
  subjectId: string,
  active: boolean,
): Promise<PermissionWriteResult> {
  if (actor.id === subjectId) return { ok: false, reason: 'self-edit' };
  if (!(await assertActiveOwner(db, actor))) return { ok: false, reason: 'not-owner' };

  const subject = await getEmployee(db, subjectId);
  if (!subject) return { ok: false, reason: 'not-found' };

  if (!active && subject.isOwner && (await otherActiveOwners(db, subjectId)) === 0) {
    return { ok: false, reason: 'last-owner' };
  }

  const updated = await db
    .update(adminUser)
    .set({ active })
    .where(and(eq(adminUser.id, subjectId), eq(adminUser.active, subject.active)))
    .returning({ id: adminUser.id });

  if (updated.length === 0) return { ok: false, reason: 'last-owner' };

  await db.insert(adminAudit).values({
    actorId: actor.id,
    action: active ? 'employee.activated' : 'employee.deactivated',
    subjectId,
  });

  return { ok: true };
}

/** True when a temporary password was issued and has gone stale unused. */
export function isTempPasswordExpired(
  mustChangePassword: boolean,
  issuedAt: Date | null,
  now = Date.now(),
): boolean {
  if (!mustChangePassword || !issuedAt) return false;
  return now - issuedAt.getTime() > TEMP_PASSWORD_TTL_MS;
}

export { PERMISSION_LEVELS, PERMISSION_MODULES };
export type { PermissionLevel, PermissionModule };
