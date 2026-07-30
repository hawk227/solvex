'use client';

import Link from 'next/link';
import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession } from '@/lib/auth-client';

/**
 * Mobile menu. Radix Dialog supplies the focus trap, Escape handling and scroll
 * lock — a hand-rolled drawer is where keyboard users get stranded.
 */
export function MobileNav({ links }: { links: readonly { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const { data } = useSession();
  const signedIn = Boolean(data?.user);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 md:hidden" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-[min(20rem,85vw)] flex-col bg-[var(--color-background)] p-6 shadow-[var(--shadow-lg)] md:hidden">
          <div className="mb-6 flex items-center justify-between">
            <Dialog.Title className="text-lg font-bold">Menu</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close menu">
                <X className="h-5 w-5" />
              </Button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Site navigation</Dialog.Description>

          <nav aria-label="Mobile" className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex min-h-[var(--web-control-height)] items-center rounded-[var(--radius-md)] px-3 text-[var(--color-text)] transition-colors duration-[var(--duration-hover)] hover:bg-[var(--color-surface)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto flex flex-col gap-2">
            {signedIn ? (
              <>
                <Button asChild variant="outline">
                  <Link href="/orders" onClick={() => setOpen(false)}>
                    Your bookings
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/support" onClick={() => setOpen(false)}>
                    Support
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/account" onClick={() => setOpen(false)}>
                    Your account
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="outline">
                  <Link href="/login" onClick={() => setOpen(false)}>
                    Log in
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/signup" onClick={() => setOpen(false)}>
                    Sign up
                  </Link>
                </Button>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
