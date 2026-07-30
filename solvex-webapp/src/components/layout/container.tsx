import { cn } from '@/lib/cn';

/** Page gutter and max width from the design system's container scale. */
export function Container({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-[var(--web-container)] px-[var(--web-container-pad)]',
        className,
      )}
      {...props}
    />
  );
}

/** Vertical rhythm wrapper: 56 / 72 / 96px by breakpoint. */
export function Section({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return <section className={cn('py-[var(--web-section-y)]', className)} {...props} />;
}

export function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-primary)]">
            {eyebrow}
          </p>
        )}
        {/* h2: pages have exactly one h1, which is the hero or page title. */}
        <h2 className="text-2xl font-bold leading-tight text-[var(--color-text)] md:text-3xl">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}
