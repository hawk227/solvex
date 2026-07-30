'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TICKET_STATUSES, type TicketStatus } from '@solvex/db';
import { TICKET_STATUS_LABEL } from '@/lib/ticket-queries';
import { changeStatus } from '../actions';

export function StatusControl({
  ticketId,
  status,
}: {
  ticketId: number;
  status: TicketStatus;
}) {
  const router = useRouter();
  // Derived from the prop rather than left uncontrolled, so a refresh elsewhere
  // cannot leave a stale value sitting in the box.
  const [choice, setChoice] = useState<TicketStatus>(status);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function apply(next: TicketStatus) {
    setChoice(next);
    if (next === status) return;

    setPending(true);
    setError(undefined);
    const result = await changeStatus(ticketId, next);
    setPending(false);

    if (!result.ok) {
      setChoice(status);
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="ticket-status" className="text-xs text-[var(--color-muted)]">
        Status
      </label>
      <select
        id="ticket-status"
        value={choice}
        disabled={pending}
        onChange={(e) => void apply(e.target.value as TicketStatus)}
        className="h-[var(--cms-input-height)] rounded-[var(--cms-control-radius)] border border-[var(--color-border)] bg-[var(--color-input-bg)] px-2 text-[13px] disabled:opacity-50"
      >
        {TICKET_STATUSES.map((s) => (
          <option key={s} value={s}>
            {TICKET_STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      {error && (
        <p role="alert" className="text-xs text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  );
}
