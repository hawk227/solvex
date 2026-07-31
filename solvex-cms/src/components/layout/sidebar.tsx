'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  CalendarClock,
  ChevronsUpDown,
  Gift,
  HardHat,
  KeyRound,
  Layers,
  LayoutGrid,
  LogOut,
  ScrollText,
  Trash2,
  MapPin,
  LifeBuoy,
  Settings,
  ShoppingCart,
  UserCog,
  Users,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Logo } from '@/components/ui/logo';
import { signOut } from '@/lib/auth-client';

type Item = {
  href: string;
  label: string;
  icon: typeof LayoutGrid;
  module: string;
  /** Owner-only entries sit outside the permission grid. */
  ownerOnly?: boolean;
  /**
   * Wording for the count badge. A bare number beside "Orders" does not say
   * what it counts, so each item spells out its own meaning for screen readers.
   */
  badgeLabel?: (n: number) => string;
};

/**
 * Grouped by how often you touch them, not alphabetically.
 *
 * A flat list made Orders — used hourly — look as important as Slots, which is
 * touched twice a year. Each entry still declares the module it needs; hiding is
 * a convenience, the page and action guards are the control.
 */
/** Sits above the groups, with no heading: it is the landing page, not a category. */
const DASHBOARD: Item = {
  href: '/admin/dashboard',
  label: 'Dashboard',
  icon: LayoutGrid,
  module: 'analytics',
};

const GROUPS: { heading: string; items: Item[] }[] = [
  {
    heading: 'Operations',
    items: [
      {
        href: '/admin/orders',
        label: 'Orders',
        icon: ShoppingCart,
        module: 'orders',
        badgeLabel: (n) => `${n} awaiting approval`,
      },
      {
        href: '/admin/tickets',
        label: 'Tickets',
        icon: LifeBuoy,
        module: 'tickets',
        badgeLabel: (n) => `${n} needing a reply`,
      },
      { href: '/admin/technicians', label: 'Technicians', icon: HardHat, module: 'technicians' },
    ],
  },
  {
    heading: 'Catalog',
    items: [
      { href: '/admin/categories', label: 'Categories', icon: Layers, module: 'catalog' },
      { href: '/admin/services', label: 'Services', icon: Wrench, module: 'catalog' },
    ],
  },
  {
    heading: 'People',
    items: [
      { href: '/admin/customers', label: 'Customers', icon: Users, module: 'customers' },
      { href: '/admin/referrals', label: 'Referrals', icon: Gift, module: 'referrals' },
    ],
  },
  {
    heading: 'Configure',
    items: [
      { href: '/admin/areas', label: 'Areas', icon: MapPin, module: 'settings' },
      { href: '/admin/slots', label: 'Slots', icon: CalendarClock, module: 'settings' },
      { href: '/admin/settings', label: 'Settings', icon: Settings, module: 'settings' },
      {
        href: '/admin/employees',
        label: 'Employees',
        icon: UserCog,
        module: 'settings',
        ownerOnly: true,
      },
      {
        href: '/admin/audit',
        label: 'Activity log',
        icon: ScrollText,
        module: 'settings',
        ownerOnly: true,
      },
      {
        href: '/admin/deleted',
        label: 'Deleted records',
        icon: Trash2,
        module: 'settings',
        ownerOnly: true,
      },
    ],
  },
];

export function Sidebar({
  employee,
  badges,
}: {
  employee: {
    name: string;
    email: string;
    isOwner: boolean;
    permissions: Record<string, string>;
  };
  /** Counts worth seeing without navigating, keyed by href. */
  badges: Record<string, number>;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const allowed = (item: Item) => {
    if (item.ownerOnly) return employee.isOwner;
    return employee.isOwner || employee.permissions[item.module] !== 'none';
  };

  const groups = GROUPS.map((g) => ({ ...g, items: g.items.filter(allowed) })).filter(
    (g) => g.items.length > 0,
  );

  const showDashboard = allowed(DASHBOARD);

  // The logo should never land on a page this employee cannot open, so it points
  // at the dashboard when they have it and their first available page otherwise.
  const homeHref = showDashboard
    ? DASHBOARD.href
    : (groups[0]?.items[0]?.href ?? '/admin/orders');

  const itemClass = (active: boolean) =>
    cn(
      'flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-[13px]',
      'transition-colors duration-[var(--duration-hover)]',
      active
        ? 'bg-[var(--color-primary-tint)]/30 font-medium text-[var(--color-primary)]'
        : 'text-[var(--color-text)] hover:bg-[var(--color-card)]',
    );

  return (
    <aside
      // sticky rather than fixed: it stays in the flex row, so the content
      // beside it needs no compensating margin and can never slide under it.
      className="sticky top-0 self-start flex h-screen w-[var(--cms-sidebar-width)] shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]"
      aria-label="Main"
    >
      <div className="flex flex-col gap-0.5 px-5 py-4">
        <Link href={homeHref} aria-label="SolveX back-office home">
          <Logo height={30} />
        </Link>
        <span className="text-xs text-[var(--color-muted)]">Back-office</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-2">
        {showDashboard && (
          <ul className="mb-3 flex flex-col gap-0.5">
            <li>
              <Link
                href={DASHBOARD.href}
                aria-current={pathname === DASHBOARD.href ? 'page' : undefined}
                className={itemClass(pathname === DASHBOARD.href)}
              >
                <DASHBOARD.icon aria-hidden className="h-4 w-4 shrink-0" />
                <span className="flex-1">{DASHBOARD.label}</span>
              </Link>
            </li>
          </ul>
        )}

        {groups.map((group) => (
          <div key={group.heading} className="mb-3">
            <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
              {group.heading}
            </p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map(({ href, label, icon: Icon, badgeLabel }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`);
                const count = badges[href] ?? 0;
                const badge = badgeLabel && count > 0 ? count : null;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? 'page' : undefined}
                      className={itemClass(active)}
                    >
                      <Icon aria-hidden className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{label}</span>
                      {badge !== null && (
                        <span
                          className="inline-flex min-w-5 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--color-warning)] px-1.5 text-[11px] font-semibold text-white"
                          aria-label={badgeLabel!(badge)}
                        >
                          {badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Account menu. Sign out used to be a bare button here with nowhere to
          change your own password — the change-password page was unreachable. */}
      <div className="border-t border-[var(--color-border)] p-3">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-2 py-2 text-left transition-colors duration-[var(--duration-hover)] hover:bg-[var(--color-card)]"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-tint)] text-xs font-bold text-[var(--color-primary)]">
                {employee.name.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-[13px] font-medium text-[var(--color-text)]">
                  {employee.name}
                </span>
                <span className="block truncate text-xs text-[var(--color-muted)]">
                  {employee.isOwner ? 'Owner' : 'Staff'}
                </span>
              </span>
              <ChevronsUpDown aria-hidden className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              side="top"
              align="start"
              sideOffset={8}
              className="z-50 min-w-56 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] p-1 shadow-[var(--shadow-md)]"
            >
              <div className="px-3 py-2">
                <p className="truncate text-[13px] font-medium">{employee.name}</p>
                <p className="truncate text-xs text-[var(--color-muted)]">{employee.email}</p>
              </div>

              <DropdownMenu.Separator className="my-1 h-px bg-[var(--color-border)]" />

              <DropdownMenu.Item asChild>
                <Link
                  href="/change-password"
                  className="flex min-h-9 cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] px-3 text-[13px] outline-none data-[highlighted]:bg-[var(--color-surface)]"
                >
                  <KeyRound aria-hidden className="h-4 w-4" />
                  Change password
                </Link>
              </DropdownMenu.Item>

              <DropdownMenu.Separator className="my-1 h-px bg-[var(--color-border)]" />

              <DropdownMenu.Item
                onSelect={async () => {
                  await signOut();
                  router.push('/login');
                  router.refresh();
                }}
                className="flex min-h-9 cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] px-3 text-[13px] text-[var(--color-muted)] outline-none data-[highlighted]:bg-[var(--color-surface)] data-[highlighted]:text-[var(--color-text)]"
              >
                <LogOut aria-hidden className="h-4 w-4" />
                Sign out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </aside>
  );
}
