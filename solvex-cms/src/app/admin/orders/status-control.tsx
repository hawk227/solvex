'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateOrderStatus } from './actions';

type Option = { value: string; label: string };

/**
 * Advance an order, or cancel it.
 *
 * Two things here are deliberate:
 *
 * 1. The select is CONTROLLED. As an uncontrolled element it kept its previous
 *    DOM value across the re-render that follows a successful transition, and
 *    because the option list changes with the status, the stale value could
 *    resolve to a different option than the one shown — an admin advancing an
 *    order could cancel it by accident.
 *
 * 2. Cancelling is a separate, confirmed action rather than one entry in the
 *    same dropdown. It frees the slot and refunds credit, so it should not be a
 *    single mis-click away from "approve".
 */
export function StatusControl({
  orderId,
  status,
  options,
}: {
  orderId: number;
  status: string;
  options: Option[];
}) {
  const advanceOptions = options.filter((o) => o.value !== 'CANCELLED');
  const canCancel = options.some((o) => o.value === 'CANCELLED');

  const [chosen, setChosen] = useState<string | null>(null);

  // Derived, not stored: after a successful transition the option list changes,
  // and a value held in state would go stale and target a transition that is no
  // longer valid. Falling back to the first option keeps the control honest.
  const next =
    chosen && advanceOptions.some((o) => o.value === chosen)
      ? chosen
      : (advanceOptions[0]?.value ?? '');
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  if (options.length === 0) {
    return <span className="text-xs text-[var(--color-muted)]">No further changes</span>;
  }

  async function apply(target: string, form?: HTMLFormElement) {
    setPending(true);
    setError(undefined);

    const data = new FormData();
    data.set('orderId', String(orderId));
    data.set('next', target);
    const note = form ? (new FormData(form).get('note') as string | null) : null;
    if (note) data.set('note', note);

    const result = await updateOrderStatus(data);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setChosen(null);
    setConfirmingCancel(false);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!next) return;
    void apply(next, e.currentTarget);
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {advanceOptions.length > 0 && (
        <form onSubmit={onSubmit} className="flex items-center gap-2">
          <select
            // Keyed on the current status so the element is rebuilt whenever the
            // available transitions change.
            key={status}
            name="next"
            aria-label="Move order to"
            value={next}
            onChange={(e) => setChosen(e.target.value)}
            className="h-8 rounded-[var(--cms-control-radius)] border border-[var(--color-border)] bg-[var(--color-input-bg)] px-2 text-[13px]"
          >
            {advanceOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <Input name="note" placeholder="Note (optional)" className="h-8 w-36 text-xs" />
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? '…' : 'Apply'}
          </Button>
        </form>
      )}

      {canCancel &&
        (confirmingCancel ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--color-muted)]">Cancel this order?</span>
            <Button size="sm" variant="ghost" onClick={() => setConfirmingCancel(false)} disabled={pending}>
              No
            </Button>
            <Button size="sm" variant="danger" onClick={() => void apply('CANCELLED')} disabled={pending}>
              {pending ? '…' : 'Yes, cancel'}
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingCancel(true)}
            className="text-xs text-[var(--color-muted)] underline-offset-2 hover:text-[var(--color-danger)] hover:underline"
          >
            Cancel order
          </button>
        ))}

      {error && (
        <p role="alert" className="max-w-64 text-xs text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  );
}
