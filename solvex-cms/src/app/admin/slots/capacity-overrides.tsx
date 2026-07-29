'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input, Label } from '@/components/ui/input';
import { Table, TableWrap, Th, Td, Tr, EmptyRow } from '@/components/ui/table';
import { setCapacityOverride, clearCapacityOverride } from './actions';

type Override = { date: string; slotId: number; capacity: number; label: string; dateLabel: string };

export function CapacityOverrides({
  slots,
  overrides,
  defaultCapacity,
}: {
  slots: { id: number; label: string }[];
  overrides: Override[];
  defaultCapacity: number;
}) {
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [removing, startRemoving] = useTransition();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);

    const form = e.currentTarget;
    const result = await setCapacityOverride(new FormData(form));

    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    form.reset();
  }

  if (slots.length === 0) {
    return (
      <p className="mt-4 text-[13px] text-[var(--color-muted)]">
        Add a slot before setting capacity overrides.
      </p>
    );
  }

  return (
    <div className="mt-5">
      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="ov-slot">Slot</Label>
          <select
            id="ov-slot"
            name="slotId"
            required
            className="h-[var(--cms-input-height)] rounded-[var(--cms-control-radius)] border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 text-[13px] text-[var(--color-text)]"
          >
            {slots.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <Field label="Date" htmlFor="ov-date">
          <Input id="ov-date" name="date" type="date" required />
        </Field>

        <Field label="Capacity" htmlFor="ov-capacity">
          <Input
            id="ov-capacity"
            name="capacity"
            type="number"
            min={0}
            max={999}
            required
            defaultValue={defaultCapacity}
            className="w-28"
          />
        </Field>

        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Set override'}
        </Button>
      </form>

      {error && (
        <p role="alert" className="mt-3 text-[13px] text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <div className="mt-5">
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Slot</Th>
                <Th>Capacity</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {overrides.length === 0 && (
                <EmptyRow colSpan={4}>
                  No overrides. Every day uses the default of {defaultCapacity}.
                </EmptyRow>
              )}
              {overrides.map((o) => (
                <Tr key={`${o.date}-${o.slotId}`}>
                  <Td className="font-medium">{o.dateLabel}</Td>
                  <Td>{o.label}</Td>
                  <Td>
                    {o.capacity === 0 ? (
                      <span className="text-[var(--color-danger)]">Closed</span>
                    ) : (
                      o.capacity
                    )}
                  </Td>
                  <Td className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove override for ${o.label} on ${o.dateLabel}`}
                      disabled={removing}
                      onClick={() =>
                        startRemoving(() => void clearCapacityOverride(o.date, o.slotId))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      </div>
    </div>
  );
}
