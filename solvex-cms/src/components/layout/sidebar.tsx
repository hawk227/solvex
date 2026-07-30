'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  Layers,
  Wrench,
  ShoppingCart,
  Users,
  MapPin,
  CalendarClock,
  Settings,
  Gift,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { signOut } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/categories', label: 'Categories', icon: Layers },
  { href: '/admin/services', label: 'Services', icon: Wrench },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/referrals', label: 'Referrals', icon: Gift },
  { href: '/admin/areas', label: 'Areas', icon: MapPin },
  { href: '/admin/slots', label: 'Slots', icon: CalendarClock },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
] as const;

export function Sidebar({ admin }: { admin: { name: string; email: string } }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside
      className="flex h-screen w-[var(--cms-sidebar-width)] shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]"
      aria-label="Main"
    >
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] text-base font-bold text-[var(--color-primary-foreground)]">
          S
        </div>
        <div className="leading-tight">
          <div className="text-base font-bold text-[var(--color-text)]">SolveX</div>
          <div className="text-xs text-[var(--color-muted)]">Back-office</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
          Admin
        </p>
        <ul className="flex flex-col gap-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-[13px]',
                    'transition-colors duration-[var(--duration-hover)]',
                    active
                      ? 'bg-[var(--color-primary-tint)]/30 font-medium text-[var(--color-primary)]'
                      : 'text-[var(--color-text)] hover:bg-[var(--color-card)]',
                  )}
                >
                  <Icon aria-hidden className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-[var(--color-border)] px-3 py-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary-tint)] text-xs font-bold text-[var(--color-primary)]">
            {admin.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[13px] font-medium text-[var(--color-text)]">
              {admin.name}
            </div>
            <div className="truncate text-xs text-[var(--color-muted)]">{admin.email}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={async () => {
            await signOut();
            router.push('/login');
            router.refresh();
          }}
          className="mt-1 flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-[13px] text-[var(--color-muted)] transition-colors duration-[var(--duration-hover)] hover:bg-[var(--color-card)] hover:text-[var(--color-text)]"
        >
          <LogOut aria-hidden className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
