import { requireAdmin } from '@/lib/session';
import { Sidebar } from '@/components/layout/sidebar';

/**
 * Gates every /admin route. Server actions repeat this check themselves —
 * a layout guard protects navigation, not direct POSTs to an action endpoint.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className="flex min-h-screen">
      <Sidebar admin={admin} />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
