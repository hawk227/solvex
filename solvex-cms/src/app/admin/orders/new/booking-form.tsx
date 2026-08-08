'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { BookingCatalog, SlotAvailability } from '@solvex/db';
import { Field, Input, Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { createOrderForCustomer } from './actions';

const SELECT_CLASS =
  'h-[var(--cms-input-height)] w-full rounded-[var(--cms-control-radius)] border border-[var(--color-border)] ' +
  'bg-[var(--color-input-bg)] px-3 text-[13px] text-[var(--color-text)]';

function buildComboKey(optionIds: number[]): string {
  return [...optionIds].sort((a, b) => a - b).join('-');
}

export function BookingForm({
  userId,
  catalog,
  creditBalance,
  initialAvailability,
  initialDate,
}: {
  userId: string;
  catalog: BookingCatalog;
  creditBalance: number;
  initialAvailability: SlotAvailability[];
  initialDate: string;
}) {
  const router = useRouter();
  const [serviceId, setServiceId] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<Record<number, string>>({});
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  const groups = useMemo(
    () => catalog.groups.filter((g) => g.serviceId === Number(serviceId)),
    [catalog.groups, serviceId],
  );

  const optionIds = groups
    .map((g) => selectedOptions[g.id])
    .filter((v): v is string => Boolean(v))
    .map(Number);

  const allOptionsChosen = groups.length > 0 && optionIds.length === groups.length;
  const comboKey = buildComboKey(optionIds);
  const catalogPrice =
    serviceId && (groups.length === 0 || allOptionsChosen)
      ? (catalog.prices.find((p) => p.serviceId === Number(serviceId) && p.comboKey === comboKey)?.price ?? null)
      : null;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);

    const data = new FormData(e.currentTarget);
    data.set('userId', userId);
    data.set('optionIds', optionIds.join(','));

    const result = await createOrderForCustomer(data);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push('/admin/orders');
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label="Service" htmlFor="serviceId">
        <select
          id="serviceId"
          name="serviceId"
          required
          value={serviceId}
          onChange={(e) => {
            setServiceId(e.target.value);
            setSelectedOptions({});
          }}
          className={SELECT_CLASS}
        >
          <option value="" disabled>
            Choose a service
          </option>
          {catalog.services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.categoryName} — {s.name}
            </option>
          ))}
        </select>
      </Field>

      {groups.map((group) => (
        <Field key={group.id} label={group.name} htmlFor={`group-${group.id}`}>
          <select
            id={`group-${group.id}`}
            required
            value={selectedOptions[group.id] ?? ''}
            onChange={(e) => setSelectedOptions((prev) => ({ ...prev, [group.id]: e.target.value }))}
            className={SELECT_CLASS}
          >
            <option value="" disabled>
              {`Choose ${group.name.toLowerCase()}`}
            </option>
            {group.options.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </Field>
      ))}

      <Field label="Date" htmlFor="scheduledDate">
        <Input id="scheduledDate" name="scheduledDate" type="date" required defaultValue={initialDate} min={initialDate} />
      </Field>

      <Field
        label="Time window"
        htmlFor="slotId"
        hint="Availability shown is for the date above at page load. If you change the date, the server still checks capacity when you submit."
      >
        <select id="slotId" name="slotId" required defaultValue="" className={SELECT_CLASS}>
          <option value="" disabled>
            Choose a time window
          </option>
          {initialAvailability.map((slot) => (
            <option key={slot.slotId} value={slot.slotId} disabled={slot.remaining <= 0}>
              {slot.label} ({slot.startTime}–{slot.endTime}) — {slot.remaining} left
            </option>
          ))}
        </select>
      </Field>

      {creditBalance > 0 && (
        <Field label="Credit to apply" htmlFor="requestedCredit" hint={`Balance: ৳${creditBalance}`}>
          <Input
            id="requestedCredit"
            name="requestedCredit"
            type="number"
            min={0}
            max={creditBalance}
            defaultValue={0}
          />
        </Field>
      )}

      <Field
        label="Custom price (optional)"
        htmlFor="priceOverride"
        hint={
          catalogPrice !== null
            ? `Catalog price: ৳${catalogPrice}. Leave blank to use it.`
            : 'Leave blank to use the catalog price.'
        }
      >
        <Input
          id="priceOverride"
          name="priceOverride"
          type="number"
          min={0}
          placeholder={catalogPrice !== null ? String(catalogPrice) : undefined}
        />
      </Field>

      <Field label="Notes" htmlFor="notes">
        <Textarea id="notes" name="notes" maxLength={500} />
      </Field>

      {error && (
        <p role="alert" className="text-[13px] text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? 'Placing order…' : 'Place order'}
        </Button>
      </div>
    </form>
  );
}
