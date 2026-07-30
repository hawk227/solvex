'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import {
  PERMISSION_LEVELS,
  PERMISSION_MODULES,
  isUniqueViolation,
  schema,
  setEmployeeActive,
  setOwner,
  setPermissions,
  type PermissionGrid,
  type PermissionLevel,
} from '@solvex/db';
import { auth } from '@/lib/auth';
import { db } from '@/lib/cf';
import { requireOwner } from '@/lib/session';
import { audit } from '@/lib/audit';

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

const REASONS: Record<string, string> = {
  'self-edit': 'You cannot change your own access. Ask another owner.',
  'not-owner': 'Only an owner can change employee access.',
  'last-owner': 'This is the last active owner. Promote someone else first.',
  'not-found': 'That employee no longer exists.',
};

const NewEmployee = z.object({
  name: z.string().trim().min(2, 'Enter their full name.').max(80),
  email: z.string().trim().email('Enter a valid email address.'),
  // A temporary password travels over chat, so it is held to a longer minimum
  // than a password the employee chose themselves.
  password: z.string().min(12, 'Temporary password must be at least 12 characters.').max(128),
});

function gridFromForm(formData: FormData): PermissionGrid {
  const grid = {} as PermissionGrid;
  // Named `mod`, not `module`: the latter shadows the CommonJS global and the
  // bundler can rewrite it.
  for (const mod of PERMISSION_MODULES) {
    const raw = String(formData.get(`perm:${mod}`) ?? 'none');
    const level = (PERMISSION_LEVELS as readonly string[]).includes(raw)
      ? (raw as PermissionLevel)
      : 'none';
    grid[mod] = level;
  }
  return grid;
}

export async function createEmployee(formData: FormData): Promise<ActionResult> {
  const actor = await requireOwner();

  const parsed = NewEmployee.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the form.' };
  }

  const { name, email, password } = parsed.data;
  const ctx = await auth().$context;

  let userId: string;
  try {
    const user = await ctx.internalAdapter.createUser({ email, name, emailVerified: true });
    userId = user.id;
    await ctx.internalAdapter.createAccount({
      userId,
      providerId: 'credential',
      accountId: userId,
      password: await ctx.password.hash(password),
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { ok: false, error: 'An employee with that email already exists.' };
    }
    throw err;
  }

  await db()
    .update(schema.adminUser)
    .set({
      mustChangePassword: true,
      tempPasswordIssuedAt: new Date(),
      createdBy: actor.id,
    })
    .where(eq(schema.adminUser.id, userId));

  const grid = gridFromForm(formData);
  const result = await setPermissions(db(), actor, userId, grid);
  if (!result.ok) return { ok: false, error: REASONS[result.reason] ?? 'Could not set access.' };

  // Note what access was granted, never the temporary password that came with
  // it. `redact` would strip it regardless; it is simply not passed.
  await audit({
    action: 'employees.create',
    module: 'settings',
    targetType: 'employee',
    targetId: userId,
    targetLabel: email,
    detail: { name, email, permissions: grid },
  });

  revalidatePath('/admin/employees');
  return { ok: true, id: userId };
}

export async function updateEmployeeAccess(
  subjectId: string,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireOwner();

  const wantsOwner = formData.get('isOwner') === 'on';
  const owner = await setOwner(db(), actor, subjectId, wantsOwner);
  if (!owner.ok) {
    await audit({
      action: 'employees.access.update',
      module: 'settings',
      targetType: 'employee',
      targetId: subjectId,
      outcome: 'DENIED',
      reason: owner.reason,
    });
    return { ok: false, error: REASONS[owner.reason] ?? 'Could not change role.' };
  }

  // Owners hold everything implicitly, so the grid is only meaningful for staff.
  const grid = wantsOwner ? null : gridFromForm(formData);
  if (grid) {
    const perms = await setPermissions(db(), actor, subjectId, grid);
    if (!perms.ok) return { ok: false, error: REASONS[perms.reason] ?? 'Could not set access.' };
  }

  await audit({
    action: 'employees.access.update',
    module: 'settings',
    targetType: 'employee',
    targetId: subjectId,
    detail: { isOwner: wantsOwner, permissions: grid },
  });

  revalidatePath('/admin/employees');
  revalidatePath(`/admin/employees/${subjectId}`);
  return { ok: true };
}

export async function toggleEmployeeActive(
  subjectId: string,
  active: boolean,
): Promise<ActionResult> {
  const actor = await requireOwner();
  const result = await setEmployeeActive(db(), actor, subjectId, active);
  if (!result.ok) {
    await audit({
      action: 'employees.active.set',
      module: 'settings',
      targetType: 'employee',
      targetId: subjectId,
      outcome: 'DENIED',
      reason: result.reason,
    });
    return { ok: false, error: REASONS[result.reason] ?? 'Could not update.' };
  }

  await audit({
    action: active ? 'employees.activate' : 'employees.deactivate',
    module: 'settings',
    targetType: 'employee',
    targetId: subjectId,
  });

  revalidatePath('/admin/employees');
  return { ok: true };
}

/** Issue a fresh temporary password. The employee must change it on next login. */
export async function resetEmployeePassword(
  subjectId: string,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireOwner();
  if (actor.id === subjectId) {
    return { ok: false, error: 'Change your own password from the account menu.' };
  }

  const password = String(formData.get('password') ?? '');
  if (password.length < 12) {
    return { ok: false, error: 'Temporary password must be at least 12 characters.' };
  }

  const ctx = await auth().$context;
  await ctx.internalAdapter.updatePassword(subjectId, await ctx.password.hash(password));

  await db()
    .update(schema.adminUser)
    .set({ mustChangePassword: true, tempPasswordIssuedAt: new Date() })
    .where(eq(schema.adminUser.id, subjectId));

  await db().insert(schema.adminAudit).values({
    actorId: actor.id,
    action: 'password.reset',
    subjectId,
  });

  // The fact of the reset, never the credential itself.
  await audit({
    action: 'employees.password.reset',
    module: 'settings',
    targetType: 'employee',
    targetId: subjectId,
  });

  revalidatePath('/admin/employees');
  return { ok: true };
}
