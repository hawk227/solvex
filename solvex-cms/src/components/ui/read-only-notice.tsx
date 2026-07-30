import { Eye } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Shown when an employee can see a module but not change it.
 *
 * Rendered instead of the mutating controls rather than alongside disabled ones:
 * a greyed-out button invites clicking and then explains nothing. This says why
 * up front.
 */
export function ReadOnlyNotice({ what, className }: { what: string; className?: string }) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-[var(--radius-md)] bg-[var(--color-surface)] px-4 py-3',
        className,
      )}
    >
      <Eye aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-muted)]" />
      <p className="text-[13px] text-[var(--color-muted)]">
        You have view-only access to {what}. Ask an owner if you need to make changes.
      </p>
    </div>
  );
}
