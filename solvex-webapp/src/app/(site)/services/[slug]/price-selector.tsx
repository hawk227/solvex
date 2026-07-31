'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { buildComboKey } from '@solvex/db';
import { Button } from '@/components/ui/button';
import { formatTaka } from '@/lib/format';
import { cn } from '@/lib/cn';

type Group = { id: number; name: string; options: { id: number; label: string }[] };

/**
 * Variable picker and live price.
 *
 * The price shown is looked up from the exact combination the customer selected,
 * using the same `buildComboKey` the CMS wrote the rows with — so the number here
 * cannot drift from the number the admin entered. A combination with no row is
 * reported as unavailable rather than falling back to a guess.
 */
export function PriceSelector({
  serviceSlug,
  groups,
  prices,
  fallbackPrice,
}: {
  serviceSlug: string;
  groups: Group[];
  prices: { comboKey: string; price: number }[];
  fallbackPrice: number | null;
}) {
  const priceByKey = useMemo(
    () => new Map(prices.map((p) => [p.comboKey, p.price])),
    [prices],
  );

  const [selected, setSelected] = useState<Record<number, number>>(() =>
    Object.fromEntries(
      groups.flatMap((g) => (g.options[0] ? [[g.id, g.options[0].id]] : [])),
    ),
  );

  const allChosen = groups.every((g) => selected[g.id] !== undefined);
  const comboKey = allChosen
    ? buildComboKey(groups.map((g) => selected[g.id]!).filter((v) => v !== undefined))
    : null;
  const price = comboKey !== null ? (priceByKey.get(comboKey) ?? null) : null;

  const bookHref = `/book/${serviceSlug}${comboKey ? `?combo=${encodeURIComponent(comboKey)}` : ''}`;

  return (
    <div className="rounded-[var(--web-card-radius)] border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-[var(--shadow-sm)]">
      {groups.length > 0 && (
        <div className="flex flex-col gap-5">
          {groups.map((group) => (
            <fieldset key={group.id}>
              <legend className="mb-2 text-[var(--web-font-size-small)] font-semibold text-[var(--color-text)]">
                {group.name}
              </legend>
              <div className="flex flex-wrap gap-2">
                {group.options.map((option) => {
                  const active = selected[group.id] === option.id;
                  return (
                    <label
                      key={option.id}
                      className={cn(
                        'inline-flex min-h-[var(--web-control-height)] cursor-pointer items-center rounded-[var(--radius-md)] border px-4 text-[var(--web-font-size-small)] font-medium transition-colors duration-[var(--duration-hover)]',
                        active
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary-tint)]/25 text-[var(--color-primary)]'
                          : 'border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-primary)]',
                      )}
                    >
                      <input
                        type="radio"
                        name={`group-${group.id}`}
                        value={option.id}
                        checked={active}
                        onChange={() =>
                          setSelected((prev) => ({ ...prev, [group.id]: option.id }))
                        }
                        className="sr-only"
                      />
                      {option.label}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      )}

      <div className={cn('border-t border-[var(--color-border)] pt-5', groups.length > 0 && 'mt-6')}>
        {price !== null ? (
          <>
            <p className="text-[var(--web-font-size-small)] text-[var(--color-muted)]">
              Total for your selection
            </p>
            <p className="mt-1 text-3xl font-bold text-[var(--color-text)]">{formatTaka(price)}</p>
            <p className="mt-1 text-[var(--web-font-size-caption)] text-[var(--color-muted)]">
              Paid in cash after the work is done.
            </p>
          </>
        ) : (
          <>
            <p className="font-medium text-[var(--color-text)]">
              This combination isn&apos;t priced yet
            </p>
            <p className="mt-1 text-[var(--web-font-size-small)] text-[var(--color-muted)]">
              {fallbackPrice !== null
                ? `Other options for this service start at ${formatTaka(fallbackPrice)}. Contact us for a quote on this one.`
                : 'Contact us and we will quote it for you.'}
            </p>
          </>
        )}

        <Button asChild size="lg" className="mt-5 w-full" disabled={price === null}>
          {price !== null ? (
            <Link href={bookHref}>Book this service</Link>
          ) : (
            <Link href="/contact">Request a quote</Link>
          )}
        </Button>

        <p className="mt-3 text-center text-[var(--web-font-size-caption)] text-[var(--color-muted)]">
          No payment now. Nothing is charged online.
        </p>
      </div>
    </div>
  );
}
