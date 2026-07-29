'use client';

import { useTransition } from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '@/lib/cn';

export function ActiveToggle({
  id,
  active,
  label,
  action,
}: {
  id: number;
  active: boolean;
  label: string;
  action: (id: number, active: boolean) => Promise<{ ok: boolean }>;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <SwitchPrimitive.Root
      checked={active}
      disabled={pending}
      aria-label={`${active ? 'Deactivate' : 'Activate'} ${label}`}
      onCheckedChange={(next) => startTransition(() => void action(id, next))}
      className={cn(
        'relative h-5 w-9 rounded-[var(--radius-pill)] transition-colors duration-[var(--duration-hover)]',
        'disabled:opacity-50',
        active ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]',
      )}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'block h-4 w-4 rounded-full bg-white shadow-[var(--shadow-sm)]',
          'transition-transform duration-[var(--duration-hover)]',
          'translate-x-0.5 data-[state=checked]:translate-x-4.5',
        )}
      />
    </SwitchPrimitive.Root>
  );
}
