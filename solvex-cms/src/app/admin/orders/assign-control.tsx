'use client';

import { useState, useTransition } from 'react';
import type { TechnicianOption } from '@solvex/db';
import { assignOrderTechnician } from './assign-actions';

/**
 * Technician picker for one order.
 *
 * Options are ordered best-fit first (right skill, covers the area, least busy),
 * and unsuitable people are still selectable — real dispatch overrides those
 * rules constantly, so the list informs rather than restricts.
 */
export function AssignControl({
  orderId,
  assignedId,
  options,
  closed,
}: {
  orderId: number;
  assignedId: number | null;
  options: TechnicianOption[];
  closed: boolean;
}) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  if (closed) {
    const who = options.find((o) => o.id === assignedId);
    return (
      <span className="text-xs text-[var(--color-muted)]">{who ? who.fullName : 'Unassigned'}</span>
    );
  }

  if (options.length === 0) {
    return <span className="text-xs text-[var(--color-muted)]">No technicians on the rota</span>;
  }

  function onChange(value: string) {
    setError(undefined);
    const next = value === '' ? null : Number.parseInt(value, 10);
    startTransition(async () => {
      const result = await assignOrderTechnician(orderId, next);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <select
        aria-label="Assign technician"
        value={assignedId ?? ''}
        disabled={pending}
        onChange={(e) => onChange(e.target.value)}
        className="h-[var(--cms-input-height)] w-full max-w-sm rounded-[var(--cms-control-radius)] border border-[var(--color-border)] bg-[var(--color-input-bg)] px-2 text-[13px] disabled:opacity-50"
      >
        <option value="">Unassigned</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.fullName}
            {o.hasSkill || o.coversArea ? ' ·' : ''}
            {o.hasSkill ? ' skilled' : ''}
            {o.coversArea ? ' local' : ''}
            {` · ${o.openJobs} open`}
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
