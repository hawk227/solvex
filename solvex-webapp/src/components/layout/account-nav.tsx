'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, LayoutGrid, LifeBuoy, UserRound } from 'lucide-react';
import { cn } from '@/lib/cn';

const ITEMS = [
  { href: '/dashboard', label: 'Overview', icon: LayoutGrid },
  { href: '/orders', label: 'Bookings', icon: CalendarDays },
  { href: '/support', label: 'Support', icon: LifeBuoy },
  { href: '/account', label: 'Account', icon: UserRound },
];

/**
 * Persistent nav across the signed-in pages.
 *
 * These four pages existed already but had no relationship to each other — you
 * arrived at one and the only way to another was the header dropdown. A visible
 * row makes the signed-in area feel like one place rather than four unrelated
 * URLs, and it means someone who lands on a booking can see that support
 * exists.
 *
 * Horizontally scrollable rather than wrapped: four items fit at 375px, but the
 * labels are translatable and Bangla runs longer.
 */
export function AccountNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Your account" className="border-b border-[var(--color-border)]">
      <div className="rail mx-auto flex max-w-[var(--web-container)] gap-1 overflow-x-auto px-4 md:px-6">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          // Sub-pages keep their section marked: /orders/SX-1234 is still Bookings.
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex shrink-0 items-center gap-2 border-b-2 px-3 py-3.5 text-[var(--web-font-size-small)] font-medium',
                'transition-colors duration-[var(--duration-hover)]',
                active
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]',
              )}
            >
              <Icon aria-hidden className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
