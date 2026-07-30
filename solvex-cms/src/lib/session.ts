import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import {
  can,
  getEmployee,
  visibleModules,
  type Employee,
  type PermissionLevel,
  type PermissionModule,
} from '@solvex/db';
import { auth } from './auth';
import { db } from './cf';

export type { Employee, PermissionModule, PermissionLevel };

/**
 * The signed-in employee, with permissions read fresh from the database.
 *
 * Nothing about access lives in the session cookie: revoking a permission or
 * deactivating an account takes effect on the very next request rather than
 * whenever the cookie happens to expire.
 */
export async function getCurrentEmployee(): Promise<Employee | null> {
  const result = await auth().api.getSession({ headers: await headers() });
  if (!result?.user) return null;

  const employee = await getEmployee(db(), result.user.id);
  // A deactivated account holds nothing, so treat it as signed out.
  if (!employee || !employee.active) return null;
  return employee;
}

/**
 * Signed in, active, and past the forced password change.
 *
 * The password gate is enforced here rather than by a redirect alone: a
 * bookmarked URL would otherwise walk straight past it.
 */
async function requireSignedIn(): Promise<Employee> {
  const employee = await getCurrentEmployee();
  if (!employee) redirect('/login');
  if (employee.mustChangePassword) redirect('/change-password');
  return employee;
}

/**
 * Page guard. Uses notFound rather than a redirect on purpose — a module the
 * employee cannot see should not announce that it exists.
 */
export async function requireView(module: PermissionModule): Promise<Employee> {
  const employee = await requireSignedIn();
  if (!can(employee, module, 'view')) notFound();
  return employee;
}

/**
 * Action guard. This is the real boundary: a server action is a POST endpoint
 * that can be invoked directly, so hiding a button proves nothing.
 */
export async function requireManage(module: PermissionModule): Promise<Employee> {
  const employee = await requireSignedIn();
  if (!can(employee, module, 'manage')) {
    throw new Error(`Forbidden: ${module} requires manage access.`);
  }
  return employee;
}

/** Employee administration. Owners only, by design. */
export async function requireOwner(): Promise<Employee> {
  const employee = await requireSignedIn();
  if (!employee.isOwner) notFound();
  return employee;
}

/**
 * Whether the current employee may change this module.
 *
 * For deciding what to render. The action guards remain the control: a page that
 * forgets this check is untidy, one that forgets `requireManage` is insecure.
 */
export function canManage(employee: Employee, module: PermissionModule): boolean {
  return can(employee, module, 'manage');
}

/** For building navigation. Not a control — the guards above are. */
export async function getVisibleModules(): Promise<PermissionModule[]> {
  const employee = await getCurrentEmployee();
  return employee ? visibleModules(employee) : [];
}
