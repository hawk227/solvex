import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const TONES: Record<Tone, { dot: string; text: string; bg: string }> = {
  neutral: { dot: 'bg-[var(--color-muted)]', text: 'text-[var(--color-muted)]', bg: 'bg-[var(--color-surface)]' },
  success: { dot: 'bg-[var(--color-success)]', text: 'text-[var(--color-success)]', bg: 'bg-[var(--color-surface)]' },
  warning: { dot: 'bg-[var(--color-warning)]', text: 'text-[var(--color-warning)]', bg: 'bg-[var(--color-surface)]' },
  danger: { dot: 'bg-[var(--color-danger)]', text: 'text-[var(--color-danger)]', bg: 'bg-[var(--color-surface)]' },
  info: { dot: 'bg-[var(--color-info)]', text: 'text-[var(--color-info)]', bg: 'bg-[var(--color-surface)]' },
};

/**
 * Status pill with a leading dot. The dot is decorative — the label carries
 * the meaning, so status is never communicated by color alone.
 */
export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  const t = TONES[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] px-2.5 py-1 text-xs font-medium',
        t.bg,
        t.text,
        className,
      )}
    >
      <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', t.dot)} />
      {children}
    </span>
  );
}
