import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from './auth';

export type AdminSessionUser = {
  id: string;
  name: string;
  email: string;
};

/** Current admin, or null when signed out. */
export async function getAdmin(): Promise<AdminSessionUser | null> {
  const result = await auth().api.getSession({ headers: await headers() });
  if (!result?.user) return null;
  return {
    id: result.user.id,
    name: result.user.name,
    email: result.user.email,
  };
}

/**
 * Guard for every admin route and every mutating server action.
 *
 * Called inside the page/action itself rather than only in proxy.ts: a layout
 * or proxy check protects navigation, but a server action is a POST endpoint
 * that can be invoked directly, so each one must establish its own caller.
 */
export async function requireAdmin(): Promise<AdminSessionUser> {
  const admin = await getAdmin();
  if (!admin) redirect('/login');
  return admin;
}
