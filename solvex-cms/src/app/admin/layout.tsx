import { redirect } from 'next/navigation';
import { eq, sql } from 'drizzle-orm';
import { can, schema } from '@solvex/db';
import { db } from '@/lib/cf';
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

  // Only counted for employees who can actually open the orders list — showing a
  // badge for a page they cannot reach would be noise.
  let pendingOrders = 0;
  if (can(employee, 'orders', 'view')) {
    const [row] = await db()
      .select({ n: sql<number>`count(*)` })
      .from(schema.orders)
      .where(eq(schema.orders.status, 'PENDING'));
    pendingOrders = Number(row?.n ?? 0);
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar employee={employee} pendingOrders={pendingOrders} />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
