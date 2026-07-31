'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition, type FormEvent } from 'react';
import { buildComboKey, type SlotAvailability } from '@solvex/db';
import { Button } from '@/components/ui/button';
import { Field, Textarea } from '@/components/ui/input';
import { formatTaka } from '@/lib/format';
import { cn } from '@/lib/cn';
import { fetchAvailability } from './availability-action';
import { submitBooking } from './actions';
import { Calendar } from '@/components/ui/calendar';

type Group = { id: number; name: string; options: { id: number; label: string }[] };
type DateOption = { value: string; weekday: string; day: string; month: string };

export function BookingForm({
  serviceId,
  groups,
  prices,
  initialComboKey,
  dates,
  initialAvailability,
  creditBalance,
  profile,
}: {
  serviceId: number;
  groups: Group[];
  prices: { comboKey: string; price: number }[];
  initialComboKey: string | null;
  dates: DateOption[];
  initialAvailability: SlotAvailability[];
  creditBalance: number;
  profile: { fullName: string; phone: string; address: string };
}) {
  const router = useRouter();
  const priceByKey = new Map(prices.map((p) => [p.comboKey, p.price]));

  /** Pre-select from ?combo= when it is a combination this service actually has. */
  const initialSelection = (): Record<number, number> => {
    if (initialComboKey) {
      const ids = new Set(
        initialComboKey
          .split('-')
          .map((s) => Number.parseInt(s, 10))
          .filter(Number.isInteger),
      );
      const picked: Record<number, number> = {};
      for (const group of groups) {
        const match = group.options.find((o) => ids.has(o.id));
        if (match) picked[group.id] = match.id;
      }
      if (Object.keys(picked).length === groups.length) return picked;
    }
    return Object.fromEntries(
      groups.flatMap((g) => (g.options[0] ? [[g.id, g.options[0].id]] : [])),
    );
  };

  const [selected, setSelected] = useState<Record<number, number>>(initialSelection);
  const [date, setDate] = useState(dates[0]!.value);
  const [availability, setAvailability] = useState(initialAvailability);
  const [slotId, setSlotId] = useState<number | null>(null);
  const [useCredit, setUseCredit] = useState(true);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [loadingSlots, startLoadingSlots] = useTransition();

  const optionIds = groups.map((g) => selected[g.id]).filter((v): v is number => v !== undefined);
  const allChosen = optionIds.length === groups.length;
  const comboKey = allChosen ? buildComboKey(optionIds) : null;
  const basePrice = comboKey !== null ? (priceByKey.get(comboKey) ?? null) : null;

  const creditToApply =
    useCredit && basePrice !== null ? Math.min(creditBalance, basePrice) : 0;
  const total = basePrice === null ? null : basePrice - creditToApply;

  function changeDate(next: string) {
    setDate(next);
    setSlotId(null);
    startLoadingSlots(async () => {
      setAvailability(await fetchAvailability(next));
    });
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);

    const result = await submitBooking(new FormData(e.currentTarget));

    setPending(false);
    if (!result.ok) {
      setError(result.error);
      // The slot may have filled while the form was open, so refresh the counts.
      startLoadingSlots(async () => setAvailability(await fetchAvailability(date)));
      return;
    }

    router.push(`/orders/${result.code}?placed=1`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="optionIds" value={optionIds.join(',')} />
      <input type="hidden" name="scheduledDate" value={date} />
      <input type="hidden" name="slotId" value={slotId ?? ''} />
      <input type="hidden" name="useCredit" value={creditToApply} />

      <div className="flex flex-col gap-8">
        {groups.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-[var(--color-text)]">Your appliance</h2>
            <div className="mt-4 flex flex-col gap-5">
              {groups.map((group) => (
                <fieldset key={group.id}>
                  <legend className="mb-2 font-medium text-[var(--color-text)]">
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
                              : 'border-[var(--color-border)] hover:border-[var(--color-primary)]',
                          )}
                        >
                          <input
                            type="radio"
                            name={`g-${group.id}`}
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
          </section>
        )}

        <section>
          <h2 className="text-xl font-bold text-[var(--color-text)]">Pick a date</h2>
          <div className="mt-4 max-w-md">
            <Calendar
              value={date}
              min={dates[0]!.value}
              max={dates[dates.length - 1]!.value}
              onSelect={changeDate}
            />
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[var(--color-text)]">Pick a time window</h2>
          <div className="mt-4 flex flex-col gap-2" aria-busy={loadingSlots}>
            {availability.length === 0 && (
              <p className="text-[var(--color-muted)]">No windows are open on this date.</p>
            )}
            {availability.map((slot) => {
              const full = slot.remaining <= 0;
              const active = slotId === slot.slotId;
              return (
                <label
                  key={slot.slotId}
                  className={cn(
                    'flex min-h-[var(--web-control-height-lg)] items-center justify-between gap-4 rounded-[var(--radius-md)] border px-4 transition-colors duration-[var(--duration-hover)]',
                    full
                      ? 'cursor-not-allowed border-[var(--color-border)] opacity-50'
                      : 'cursor-pointer',
                    active && !full
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary-tint)]/25'
                      : 'border-[var(--color-border)]',
                  )}
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="slot"
                      disabled={full}
                      checked={active}
                      onChange={() => setSlotId(slot.slotId)}
                      className="sr-only"
                    />
                    <span className="font-medium">{slot.label}</span>
                  </span>
                  <span className="text-[var(--web-font-size-small)] text-[var(--color-muted)]">
                    {full ? 'Fully booked' : `${slot.remaining} left`}
                  </span>
                </label>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[var(--color-text)]">Where we are coming</h2>
          <div className="mt-4 rounded-[var(--web-card-radius)] bg-[var(--color-surface)] p-4">
            <p className="font-medium">{profile.fullName}</p>
            <p className="text-[var(--web-font-size-small)] text-[var(--color-muted)]">
              {profile.phone}
            </p>
            <p className="mt-1 text-[var(--web-font-size-small)] text-[var(--color-muted)]">
              {profile.address}
            </p>
            <a
              href="/profile/complete?next=/orders"
              className="mt-3 inline-block text-[var(--web-font-size-small)] text-[var(--color-primary)] hover:underline"
            >
              Change address
            </a>
          </div>
        </section>

        <Field label="Anything we should know?" htmlFor="notes" hint="Optional.">
          <Textarea
            id="notes"
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Second floor, no lift. Gate code 1234."
          />
        </Field>
      </div>

      <aside className="xl:sticky xl:top-6 xl:self-start">
        <div className="rounded-[var(--web-card-radius)] border border-[var(--color-border)] p-6">
          <h2 className="font-bold text-[var(--color-text)]">Summary</h2>

          <dl className="mt-4 flex flex-col gap-2 text-[var(--web-font-size-small)]">
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--color-muted)]">Service</dt>
              <dd>{basePrice === null ? '—' : formatTaka(basePrice)}</dd>
            </div>
            {creditBalance > 0 && (
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--color-muted)]">Credit applied</dt>
                <dd className="text-[var(--color-success)]">
                  {creditToApply > 0 ? `− ${formatTaka(creditToApply)}` : formatTaka(0)}
                </dd>
              </div>
            )}
          </dl>

          <div className="mt-4 flex items-baseline justify-between border-t border-[var(--color-border)] pt-4">
            <span className="font-medium">Pay in cash</span>
            <span className="text-2xl font-bold">
              {total === null ? '—' : formatTaka(total)}
            </span>
          </div>

          {creditBalance > 0 && (
            <label className="mt-4 flex cursor-pointer items-start gap-2 text-[var(--web-font-size-small)]">
              <input
                type="checkbox"
                checked={useCredit}
                onChange={(e) => setUseCredit(e.target.checked)}
                className="mt-1 h-4 w-4 accent-[var(--color-primary)]"
              />
              <span>
                Use my credit balance
                <span className="block text-[var(--color-muted)]">
                  {formatTaka(creditBalance)} available
                </span>
              </span>
            </label>
          )}

          {basePrice === null && (
            <p className="mt-4 text-[var(--web-font-size-small)] text-[var(--color-danger)]">
              This combination is not priced yet. Please contact us for a quote.
            </p>
          )}

          {error && (
            <p role="alert" className="mt-4 text-[var(--web-font-size-small)] text-[var(--color-danger)]">
              {error}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            className="mt-5 w-full"
            disabled={pending || slotId === null || basePrice === null}
          >
            {pending ? 'Placing booking…' : 'Confirm booking'}
          </Button>

          <p className="mt-3 text-center text-[var(--web-font-size-caption)] text-[var(--color-muted)]">
            Nothing is charged now. You pay the technician after the job.
          </p>
        </div>
      </aside>
    </form>
  );
}
