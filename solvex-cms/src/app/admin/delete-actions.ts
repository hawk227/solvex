'use server';

import { revalidatePath } from 'next/cache';
import { restore, softDelete, type SoftDeletable } from '@solvex/db';
import { db } from '@/lib/cf';
import { requireManage, requireOwner } from '@/lib/session';
import { audit } from '@/lib/audit';

export type DeleteResult = { ok: true } | { ok: false; error: string };

/**
 * Which permission each kind needs. Employees are owner-only, matching the rest
 * of employee administration; the others follow their module.
 */
const MODULE: Record<Exclude<SoftDeletable, 'employee'>, 'catalog' | 'technicians'> = {
  category: 'catalog',
  service: 'catalog',
  technician: 'technicians',
};

const MESSAGES: Record<string, string> = {
  'not-found': 'That record no longer exists.',
  'already-deleted': 'That record has already been deleted.',
  'self': 'You cannot delete your own account.',
  'last-owner':
    'This is the last active owner. Make someone else an owner first, or nobody will be able to administer the back office.',
};

/** Where each kind is listed, so the page updates after the write. */
const PATHS: Record<SoftDeletable, string[]> = {
  category: ['/admin/categories', '/admin/services'],
  service: ['/admin/services'],
  technician: ['/admin/technicians', '/admin/orders'],
  employee: ['/admin/employees'],
};

/**
 * Delete a record — from view, not from the database.
 *
 * The row stays so that orders, tickets and audit entries that reference it
 * keep naming something real. See `softDelete` in @solvex/db for why.
 */
export async function deleteRecord(
  kind: SoftDeletable,
  id: number | string,
  label?: string,
): Promise<DeleteResult> {
  // Written out rather than behind a helper: the repo-wide test that every
  // action is guarded reads the call, and indirection would defeat it.
  const actor =
    kind === 'employee' ? await requireOwner() : await requireManage(MODULE[kind]);

  const result = await softDelete(db(), kind, id, actor.id);

  if (!result.ok) {
    await audit({
      action: `${kind}.delete`,
      module: kind === 'employee' ? 'settings' : MODULE[kind],
      targetType: kind,
      targetId: id,
      targetLabel: label ?? null,
      outcome: result.reason === 'not-found' ? 'ERROR' : 'DENIED',
      reason: result.reason,
    });
    return { ok: false, error: MESSAGES[result.reason] ?? 'Could not delete that.' };
  }

  await audit({
    action: `${kind}.delete`,
    module: kind === 'employee' ? 'settings' : MODULE[kind],
    targetType: kind,
    targetId: id,
    targetLabel: label ?? null,
  });

  for (const path of PATHS[kind]) revalidatePath(path);
  return { ok: true };
}

/** Put a deleted record back. It returns inactive — republishing is separate. */
export async function restoreRecord(
  kind: SoftDeletable,
  id: number | string,
  label?: string,
): Promise<DeleteResult> {
  if (kind === 'employee') await requireOwner();
  else await requireManage(MODULE[kind]);

  const result = await restore(db(), kind, id);

  if (!result.ok) {
    await audit({
      action: `${kind}.restore`,
      module: kind === 'employee' ? 'settings' : MODULE[kind],
      targetType: kind,
      targetId: id,
      outcome: 'ERROR',
      reason: result.reason,
    });
    return { ok: false, error: 'That record is not deleted.' };
  }

  await audit({
    action: `${kind}.restore`,
    module: kind === 'employee' ? 'settings' : MODULE[kind],
    targetType: kind,
    targetId: id,
    targetLabel: label ?? null,
    detail: { restoredInactive: true },
  });

  for (const path of PATHS[kind]) revalidatePath(path);
  revalidatePath('/admin/deleted');
  return { ok: true };
}
