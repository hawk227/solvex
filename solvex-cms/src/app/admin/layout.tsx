import { redirect } from 'next/navigation';
import { getCurrentEmployee } from '@/lib/session';
import { Sidebar } from '@/components/layout/sidebar';

/**
 * Never prerender the back-office. Every admin page reads the live database and
 * the caller's session, and at build time there is no Cloudflare binding to
 * read from — a static export attempt fails on `getCloudflareContext`.
 * Applies to this segment and everything below it.
 */
export const dynamic = 'force-dynamic';

/**
 * Gates every /admin route. Server actions repeat this check themselves —
 * a layout guard protects navigation, not direct POSTs to an action endpoint.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // The layout only establishes who is signed in and what the nav should show.
  // Authorisation happens per page and per action, because a layout guard cannot
  // protect a server action invoked directly.
  const employee = await getCurrentEmployee();
  if (!employee) redirect('/login');
  if (employee.mustChangePassword) redirect('/change-password');

  return (
    <div className="flex min-h-screen">
      <Sidebar employee={employee} />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
