'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  CalendarDays,
  LayoutGrid,
  LifeBuoy,
  LogOut,
  Plus,
  UserRound,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Logo } from '@/components/ui/logo';
import { signOut } from '@/lib/auth-client';

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: LayoutGrid },
  { href: '/orders', label: 'Bookings', icon: CalendarDays },
  { href: '/support', label: 'Support', icon: LifeBuoy },
  { href: '/account', label: 'Account', icon: UserRound },
];

function isActive(pathname: string, href: string) {
  // A booking detail page is still Bookings.
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Chrome for the signed-in area.
 *
 * Sidebar on desktop, bottom bar on mobile. A sidebar squeezed onto a 375px
 * screen is a drawer nobody opens, and this is a phone-first market — a bottom
 * bar is the pattern people already know from every app on their device.
 *
 * "Book a service" is pinned at the top of the sidebar and given the accent
 * colour on purpose. Removing the marketing header removed the only route to
 * the catalogue, and booking is the entire point of the business — a signed-in
 * shell that makes it hard to buy again would be a costly piece of tidiness.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside
        aria-label="Your account"
        className="hidden w-60 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] md:flex"
      >
        <div className="px-5 py-5">
          <Link href="/" aria-label="SolveX home">
            <Logo height={28} />
          </Link>
        </div>

        <div className="px-3 pb-3">
          <Link
            href="/book"
            className="flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-3 text-[var(--web-font-size-small)] font-semibold text-white transition-colors duration-[var(--duration-hover)] hover:bg-[var(--color-primary-hover)]"
          >
            <Plus aria-hidden className="h-4 w-4" />
            Book a service
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-11 items-center gap-3 rounded-[var(--radius-md)] px-3 text-[var(--web-font-size-small)]',
                  'transition-colors duration-[var(--duration-hover)]',
                  active
                    ? 'bg-[var(--color-primary-tint)]/30 font-semibold text-[var(--color-primary)]'
                    : 'text-[var(--color-text)] hover:bg-[var(--color-card)]',
                )}
              >
                <Icon aria-hidden className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[var(--color-border)] p-3">
          <button
            type="button"
            onClick={() =>
              void signOut({ fetchOptions: { onSuccess: () => router.push('/') } })
            }
            className="flex min-h-11 w-full items-center gap-3 rounded-[var(--radius-md)] px-3 text-left text-[var(--web-font-size-small)] text-[var(--color-muted)] transition-colors duration-[var(--duration-hover)] hover:bg-[var(--color-card)] hover:text-[var(--color-text)]"
          >
            <LogOut aria-hidden className="h-4 w-4 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar: logo out, booking in — the two things that must stay reachable. */}
      <header className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 md:hidden">
        <Link href="/" aria-label="SolveX home">
          <Logo height={24} />
        </Link>
        <Link
          href="/book"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-3 text-[var(--web-font-size-small)] font-semibold text-white"
        >
          <Plus aria-hidden className="h-4 w-4" />
          Book
        </Link>
      </header>

      {/* pb-20 clears the fixed bottom bar so the last row is never trapped under it. */}
      <div className="min-w-0 flex-1 pb-20 md:pb-0">{children}</div>

      <nav
        aria-label="Your account"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--color-border)] bg-[var(--color-card)] md:hidden"
      >
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium',
                active ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted)]',
              )}
            >
              <Icon aria-hidden className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
