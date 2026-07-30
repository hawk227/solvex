'use server';

import { revalidatePath } from 'next/cache';
import { assignTechnician } from '@solvex/db';
import { db } from '@/lib/cf';
import { requireManage } from '@/lib/session';
import { audit } from '@/lib/audit';

export type AssignActionResult = { ok: true } | { ok: false; error: string };

const MESSAGES: Record<string, string> = {
  'order-not-found': 'That order no longer exists.',
  'technician-not-found': 'That technician no longer exists.',
  'technician-inactive': 'That technician is off the rota. Put them back on first.',
  'order-closed': 'Completed and cancelled orders cannot be reassigned.',
};

export async function assignOrderTechnician(
  orderId: number,
  technicianId: number | null,
): Promise<AssignActionResult> {
  const admin = await requireManage('orders');

  const result = await assignTechnician(db(), orderId, technicianId, admin.id);
  if (!result.ok) {
    await audit({
      action: 'orders.technician.assign',
      module: 'orders',
      targetType: 'order',
      targetId: orderId,
      outcome: 'ERROR',
      reason: result.reason,
      detail: { technicianId },
    });
    return { ok: false, error: MESSAGES[result.reason] ?? 'Could not assign that technician.' };
  }

  await audit({
    action: technicianId === null ? 'orders.technician.unassign' : 'orders.technician.assign',
    module: 'orders',
    targetType: 'order',
    targetId: orderId,
    detail: { technicianId },
  });

  revalidatePath('/admin/orders');
  revalidatePath('/admin/technicians');
  return { ok: true };
}
