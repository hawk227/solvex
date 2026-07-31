'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Month calendar for choosing a service date.
 *
 * Replaces a horizontal strip of the next fourteen days. The strip was fine at
 * full width and became unusable once the signed-in sidebar took 240px of it —
 * but the real problem was that it could only ever offer two weeks, with no way
 * to see or reach anything further out, and no sense of which day of the week a
 * date fell on.
 *
 * Dates are handled as YYYY-MM-DD strings throughout, never as Date objects
 * crossing a timezone. The server stores Asia/Dhaka dates as text, and letting
 * a browser in another zone parse "2026-08-01" into a Date is how a booking
 * ends up on the wrong day.
 */

const WEEKDAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

/** Local YYYY-MM-DD. `toISOString` would shift to UTC and skip a day. */
function toKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseKey(key: string): { year: number; month: number; day: number } {
  const [y, m, d] = key.split('-').map(Number);
  return { year: y!, month: m! - 1, day: d! };
}

export function Calendar({
  value,
  min,
  max,
  onSelect,
}: {
  /** Selected date, YYYY-MM-DD. */
  value: string;
  /** Earliest selectable date, inclusive. */
  min: string;
  /** Latest selectable date, inclusive. */
  max: string;
  onSelect: (date: string) => void;
}) {
  const selected = parseKey(value);
  const [view, setView] = useState({ year: selected.year, month: selected.month });

  const weeks = useMemo(() => {
    const firstOfMonth = new Date(view.year, view.month, 1);
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();

    // Weeks start Saturday: the Bangladeshi working week runs Saturday to
    // Thursday, so a Sunday-first grid puts the weekend in the middle.
    const lead = (firstOfMonth.getDay() + 1) % 7;

    const cells: (string | null)[] = Array.from({ length: lead }, () => null);
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(toKey(view.year, view.month, day));
    }
    while (cells.length % 7 !== 0) cells.push(null);

    return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
  }, [view]);

  const monthLabel = new Date(view.year, view.month, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });

  /*
   * Compared as an absolute month number rather than by slicing date strings.
   * The string version got both buttons wrong — it disabled next while a month
   * of bookable dates remained, and enabled previous into the past — and was
   * hard enough to reason about that the bug was not obvious by reading it.
   */
  const asMonths = (year: number, month: number) => year * 12 + month;
  const minMonth = parseKey(min);
  const maxMonth = parseKey(max);
  const viewMonths = asMonths(view.year, view.month);

  const canGoBack = viewMonths > asMonths(minMonth.year, minMonth.month);
  const canGoForward = viewMonths < asMonths(maxMonth.year, maxMonth.month);

  const shift = (by: number) =>
    setView((v) => {
      const next = new Date(v.year, v.month + by, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });

  return (
    <div className="rounded-[var(--web-card-radius)] border border-[var(--color-border)] bg-[var(--color-card)] p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => shift(-1)}
          disabled={!canGoBack}
          aria-label="Previous month"
          className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-muted)] transition-colors duration-[var(--duration-hover)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft aria-hidden className="h-5 w-5" />
        </button>

        <p aria-live="polite" className="font-semibold text-[var(--color-text)]">
          {monthLabel}
        </p>

        <button
          type="button"
          onClick={() => shift(1)}
          disabled={!canGoForward}
          aria-label="Next month"
          className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-muted)] transition-colors duration-[var(--duration-hover)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronRight aria-hidden className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            aria-hidden
            className="pb-1 text-center text-[var(--web-font-size-caption)] font-medium text-[var(--color-muted)]"
          >
            {day}
          </div>
        ))}

        {weeks.flat().map((key, i) => {
          if (!key) return <div key={`pad-${i}`} />;

          const day = Number(key.slice(-2));
          const disabled = key < min || key > max;
          const active = key === value;

          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              // Screen readers get the full date; sighted users get the number.
              aria-label={new Date(key + 'T00:00:00').toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
              onClick={() => onSelect(key)}
              className={cn(
                'flex h-11 items-center justify-center rounded-[var(--radius-md)] text-[var(--web-font-size-small)]',
                'transition-colors duration-[var(--duration-hover)]',
                disabled && 'cursor-not-allowed text-[var(--color-muted)]/40',
                !disabled && !active && 'text-[var(--color-text)] hover:bg-[var(--color-surface)]',
                active && 'bg-[var(--color-primary)] font-bold text-white',
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
