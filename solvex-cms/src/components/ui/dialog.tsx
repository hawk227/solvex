'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

/**
 * Radix supplies the focus trap, Escape handling, scroll lock, and ARIA
 * wiring; everything visual here is ours. A description is always rendered
 * (visually hidden if unused) so `aria-describedby` never dangles.
 */
export function DialogContent({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40" />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-[520px]',
          '-translate-x-1/2 -translate-y-1/2',
          'max-h-[calc(100vh-4rem)] overflow-y-auto',
          'rounded-[var(--cms-card-radius)] border border-[var(--color-border)]',
          'bg-[var(--color-card)] p-6 shadow-[var(--shadow-lg)]',
          className,
        )}
      >
        <div className="mb-5 pr-8">
          <DialogPrimitive.Title className="text-lg font-bold text-[var(--color-text)]">
            {title}
          </DialogPrimitive.Title>
          {description ? (
            <DialogPrimitive.Description className="mt-1 text-[13px] text-[var(--color-muted)]">
              {description}
            </DialogPrimitive.Description>
          ) : (
            <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
          )}
        </div>

        <DialogPrimitive.Close
          aria-label="Close"
          className="absolute right-5 top-5 rounded-[var(--radius-sm)] p-1 text-[var(--color-muted)] transition-colors duration-[var(--duration-hover)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
        >
          <X className="h-4 w-4" />
        </DialogPrimitive.Close>

        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
