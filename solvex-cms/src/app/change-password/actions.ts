'use server';

import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { schema } from '@solvex/db';
import { auth } from '@/lib/auth';
import { db } from '@/lib/cf';
import { getCurrentEmployee } from '@/lib/session';
import { auditAs } from '@/lib/audit';

export type ActionResult = { ok: true } | { ok: false; error: string };

const Input = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword: z.string().min(12, 'New password must be at least 12 characters.').max(128),
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    message: 'Choose a password different from the temporary one.',
    path: ['newPassword'],
  });

/**
 * Change your own password.
 *
 * Deliberately not behind requireManage: an employee mid-forced-change holds no
 * module access yet, and must still be able to complete this. It is guarded by
 * identity instead — you can only ever change your own, and the current password
 * must be supplied.
 */
export async function changeOwnPassword(formData: FormData): Promise<ActionResult> {
  const employee = await getCurrentEmployee();
  if (!employee) return { ok: false, error: 'Your session has expired. Sign in again.' };

  const parsed = Input.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the form.' };
  }

  const ctx = await auth().$context;

  const accounts = await ctx.internalAdapter.findAccounts(employee.id);
  const credential = accounts.find((a) => a.providerId === 'credential');
  if (!credential?.password) {
    return { ok: false, error: 'This account has no password set. Ask an owner to reset it.' };
  }

  const valid = await ctx.password.verify({
    password: parsed.data.currentPassword,
    hash: credential.password,
  });
  if (!valid) {
    // A run of these against one account is the signal worth having.
    await auditAs(employee, {
      action: 'auth.password.change',
      outcome: 'DENIED',
      reason: 'current password incorrect',
    });
    return { ok: false, error: 'Current password is incorrect.' };
  }

  await ctx.internalAdapter.updatePassword(
    employee.id,
    await ctx.password.hash(parsed.data.newPassword),
  );

  await db()
    .update(schema.adminUser)
    .set({ mustChangePassword: false, tempPasswordIssuedAt: null, lastLoginAt: new Date() })
    .where(eq(schema.adminUser.id, employee.id));

  await db().insert(schema.adminAudit).values({
    actorId: employee.id,
    action: 'password.changed',
    subjectId: employee.id,
  });

  await auditAs(employee, {
    action: 'auth.password.change',
    targetType: 'employee',
    targetId: employee.id,
  });

  return { ok: true };
}
