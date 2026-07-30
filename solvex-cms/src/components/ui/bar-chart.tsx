import { cn } from '@/lib/cn';

export type Bar = { label: string; value: number; sublabel?: string };

/**
 * Bars from divs. No charting library: a proportional bar is a width, and
 * pulling in a chart dependency to draw one is not worth the bundle.
 *
 * Percentages are data, so they are inline styles rather than tokens — there is
 * no token that can express "this bar is 63% of the tallest".
 */
export function BarList({
  bars,
  format = (v) => String(v),
  emptyMessage = 'No data yet.',
  className,
}: {
  bars: Bar[];
  format?: (value: number) => string;
  emptyMessage?: string;
  className?: string;
}) {
  const max = Math.max(...bars.map((b) => b.value), 0);

  if (bars.length === 0) {
    return <p className="text-[13px] text-[var(--color-muted)]">{emptyMessage}</p>;
  }

  return (
    <ul className={cn('flex flex-col gap-3', className)}>
      {bars.map((bar) => (
        <li key={bar.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="truncate text-[13px] font-medium text-[var(--color-text)]">
              {bar.label}
            </span>
            <span className="shrink-0 text-[13px] text-[var(--color-muted)]">
              {format(bar.value)}
              {bar.sublabel && <span className="ml-2">{bar.sublabel}</span>}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-[var(--radius-pill)] bg-[var(--color-surface)]">
            <div
              className="h-full rounded-[var(--radius-pill)] bg-[var(--color-primary)]"
              style={{ width: max === 0 ? '0%' : `${Math.round((bar.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Vertical columns for a time series. The accessible representation is the table
 * of values behind it, so the bars themselves are aria-hidden decoration.
 */
export function ColumnChart({
  points,
  format = (v) => String(v),
}: {
  points: { label: string; value: number; title: string }[];
  format?: (value: number) => string;
}) {
  const max = Math.max(...points.map((p) => p.value), 0);
  const total = points.reduce((sum, p) => sum + p.value, 0);

  if (total === 0) {
    return (
      <p className="py-8 text-center text-[13px] text-[var(--color-muted)]">
        Nothing in this period yet.
      </p>
    );
  }

  return (
    <>
      {/*
        The track has a definite height and each column fills it. A percentage
        height only resolves against a parent whose height is definite — with
        content-sized columns the bars collapse to nothing.
      */}
      <div aria-hidden className="flex h-40 gap-1">
        {points.map((point, i) => (
          <div key={i} className="flex h-full flex-1 flex-col gap-1">
            <div className="flex flex-1 items-end">
              <div
                title={`${point.title}: ${format(point.value)}`}
                className="w-full rounded-t-[var(--radius-xs)] bg-[var(--color-primary)]"
                style={{
                  // A zero day stays flat; anything above zero keeps a visible
                  // minimum so a single booking is not invisible.
                  height:
                    max === 0 || point.value === 0
                      ? '0%'
                      : `${Math.max((point.value / max) * 100, 4)}%`,
                }}
              />
            </div>
            <span className="text-center text-[10px] text-[var(--color-muted)]">
              {point.label}
            </span>
          </div>
        ))}
      </div>

      {/* The same numbers as text, for screen readers and for anyone who wants
          the exact values rather than a shape. */}
      <details className="mt-4">
        <summary className="cursor-pointer text-[13px] text-[var(--color-muted)]">
          Show values
        </summary>
        <ul className="mt-2 flex flex-col gap-1">
          {points.map((point, i) => (
            <li key={i} className="flex justify-between gap-3 text-[13px]">
              <span className="text-[var(--color-muted)]">{point.title}</span>
              <span className="font-medium">{format(point.value)}</span>
            </li>
          ))}
        </ul>
      </details>
    </>
  );
}
