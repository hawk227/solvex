import { and, eq, isNull, sql } from 'drizzle-orm';
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core';
import type { Db } from './index';
import { categories, services } from './schema/catalog';
import { technicians } from './schema/technicians';
import { adminUser } from './schema/admin-auth';

/**
 * Soft delete for the four things that must never actually leave the database.
 *
 * A category, service, technician or employee is referenced by orders, tickets
 * and audit entries that outlive it. A hard delete would either be refused by a
 * foreign key or would leave those records naming something that no longer
 * exists — an order whose service is blank is not history, it is damage.
 *
 * `deletedAt` is deliberately NOT the same as `active`:
 *
 *   active = false  — paused, expected back. Still listed in the CMS, greyed.
 *   deletedAt set   — removed. Gone from the CMS unless you ask to see deleted.
 *
 * A timestamp rather than a boolean, because "when" is half the trail, and
 * `deletedBy` carries the other half.
 */
export const SOFT_DELETE_TABLES = {
  category: categories,
  service: services,
  technician: technicians,
  employee: adminUser,
} as const;

export type SoftDeletable = keyof typeof SOFT_DELETE_TABLES;

/**
 * The filter every read must apply.
 *
 * Exported as a helper rather than written out at each call site so there is
 * one spelling of it, and so a search for `notDeleted` finds every query that
 * has been considered.
 */
export function notDeleted(table: { deletedAt: SQLiteColumn }) {
  return isNull(table.deletedAt);
}

export type SoftDeleteResult =
  | { ok: true }
  | { ok: false; reason: 'not-found' | 'already-deleted' | 'last-owner' | 'self' };

/**
 * Remove a record from view, keeping the row.
 *
 * Employees carry two extra refusals, both of which would otherwise lock
 * everyone out of the back office permanently:
 *
 *   - you cannot delete yourself, and
 *   - you cannot delete the last remaining active owner.
 *
 * Both are checked against the database in the same statement that performs the
 * write, not read-then-write, so two owners deleting each other at the same
 * moment cannot both succeed.
 */
export async function softDelete(
  db: Db,
  kind: SoftDeletable,
  id: number | string,
  actorId: string,
): Promise<SoftDeleteResult> {
  const now = new Date();

  if (kind === 'employee') {
    if (id === actorId) return { ok: false, reason: 'self' };

    // Conditional on there still being another active, undeleted owner.
    const rows = await db.all<{ id: string }>(sql`
      UPDATE admin_user
         SET deleted_at = ${now.getTime()}, deleted_by = ${actorId}, active = 0
       WHERE id = ${id as string}
         AND deleted_at IS NULL
         AND (
           is_owner = 0
           OR (
             SELECT COUNT(*) FROM admin_user
              WHERE is_owner = 1 AND active = 1 AND deleted_at IS NULL AND id <> ${id as string}
           ) > 0
         )
      RETURNING id
    `);
    if (rows.length > 0) return { ok: true };

    // Nothing updated: either it is gone already or it was the last owner.
    const [existing] = await db
      .select({ deletedAt: adminUser.deletedAt, isOwner: adminUser.isOwner })
      .from(adminUser)
      .where(eq(adminUser.id, id as string))
      .limit(1);

    if (!existing) return { ok: false, reason: 'not-found' };
    if (existing.deletedAt) return { ok: false, reason: 'already-deleted' };
    return { ok: false, reason: 'last-owner' };
  }

  const table = SOFT_DELETE_TABLES[kind];
  const updated = await db
    .update(table)
    .set({ deletedAt: now, deletedBy: actorId, active: false })
    .where(and(eq(table.id, id as never), isNull(table.deletedAt)))
    .returning({ id: table.id });

  if (updated.length > 0) return { ok: true };

  const [existing] = await db
    .select({ id: table.id })
    .from(table)
    .where(eq(table.id, id as never))
    .limit(1);

  return existing
    ? { ok: false, reason: 'already-deleted' }
    : { ok: false, reason: 'not-found' };
}

/**
 * Put a deleted record back.
 *
 * Restored inactive, never straight back into public view: a service that
 * vanished for a month should be checked over before customers can book it
 * again. Turning it back on is a separate, deliberate click.
 */
export async function restore(
  db: Db,
  kind: SoftDeletable,
  id: number | string,
): Promise<SoftDeleteResult> {
  const table = SOFT_DELETE_TABLES[kind];

  const updated = await db
    .update(table)
    .set({ deletedAt: null, deletedBy: null, active: false })
    .where(and(eq(table.id as never, id as never), sql`${table.deletedAt} IS NOT NULL`))
    .returning({ id: table.id });

  return updated.length > 0 ? { ok: true } : { ok: false, reason: 'not-found' };
}
