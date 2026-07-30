'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signOut, useSession } from '@/lib/auth-client';

/**
 * The only session-dependent part of the header, isolated into a client
 * component on purpose.
 *
 * Reading the session on the server would make EVERY page dynamic, because the
 * header is in the root layout — the static marketing pages could no longer be
 * prerendered. Keeping it client-side lets those pages stay static.
 *
 * The tradeoff is a moment before the session resolves. A fixed-width slot is
 * reserved so the header does not shift when it does (design system: avoid CLS).
 */
export function HeaderAuth() {
  const { data, isPending } = useSession();
  const router = useRouter();

  if (isPending) {
    return <div aria-hidden className="h-[var(--web-control-height)] w-24 sm:w-40" />;
  }

  if (!data?.user) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" className="hidden sm:inline-flex">
          <Link href="/login">Log in</Link>
        </Button>
        <Button asChild>
          <Link href="/signup">Sign up</Link>
        </Button>
      </div>
    );
  }

  const firstName = data.user.name.split(' ')[0] ?? 'Account';

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="outline">
          <User aria-hidden className="h-4 w-4" />
          <span className="hidden sm:inline">{firstName}</span>
          <ChevronDown aria-hidden className="h-4 w-4" />
        </Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-48 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] p-1 shadow-[var(--shadow-md)]"
        >
          <DropdownMenu.Item asChild>
            <Link
              href="/orders"
              className="flex min-h-[var(--web-control-height)] cursor-pointer items-center rounded-[var(--radius-sm)] px-3 text-[var(--web-font-size-small)] outline-none data-[highlighted]:bg-[var(--color-surface)]"
            >
              Your bookings
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link
              href="/support"
              className="flex min-h-[var(--web-control-height)] cursor-pointer items-center rounded-[var(--radius-sm)] px-3 text-[var(--web-font-size-small)] outline-none data-[highlighted]:bg-[var(--color-surface)]"
            >
              Support
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link
              href="/account"
              className="flex min-h-[var(--web-control-height)] cursor-pointer items-center rounded-[var(--radius-sm)] px-3 text-[var(--web-font-size-small)] outline-none data-[highlighted]:bg-[var(--color-surface)]"
            >
              Your account
            </Link>
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="my-1 h-px bg-[var(--color-border)]" />

          <DropdownMenu.Item
            onSelect={async () => {
              await signOut();
              router.push('/');
              router.refresh();
            }}
            className="flex min-h-[var(--web-control-height)] cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] px-3 text-[var(--web-font-size-small)] text-[var(--color-muted)] outline-none data-[highlighted]:bg-[var(--color-surface)] data-[highlighted]:text-[var(--color-text)]"
          >
            <LogOut aria-hidden className="h-4 w-4" />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
