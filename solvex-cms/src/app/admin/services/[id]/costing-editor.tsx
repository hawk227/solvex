'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/input';
import { updateServiceCosting } from '../actions';

export function CostingEditor({
  serviceId,
  material,
  tools,
  resourceCount,
  resourceCost,
  serviceTimeLabel,
  travelCost,
  internalCost,
  sopMd,
}: {
  serviceId: number;
  material: string;
  tools: string;
  resourceCount: string;
  resourceCost: string;
  serviceTimeLabel: string;
  travelCost: string;
  internalCost: string;
  sopMd: string;
}) {
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    setSaved(false);

    const result = await updateServiceCosting(serviceId, new FormData(e.currentTarget));

    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <p className="text-[13px] text-[var(--color-muted)]">
        Internal delivery-cost data. Never shown to customers or on the public site.
      </p>

      <div className="grid gap-5 lg:grid-cols-2">
        <Field label="Material" htmlFor="material" hint="e.g. Gas (1 ton–1000)">
          <Input id="material" name="material" defaultValue={material} />
        </Field>
        <Field label="Tools" htmlFor="tools" hint="e.g. Regular Tool, Gas Meter & Ampere Meter">
          <Input id="tools" name="tools" defaultValue={tools} />
        </Field>
        <Field label="Resource count" htmlFor="resourceCount" hint="Technicians needed, e.g. 2 or 2/3">
          <Input id="resourceCount" name="resourceCount" defaultValue={resourceCount} />
        </Field>
        <Field label="Resource cost (৳)" htmlFor="resourceCost">
          <Input id="resourceCost" name="resourceCost" type="number" min={0} defaultValue={resourceCost} />
        </Field>
        <Field label="Service time" htmlFor="serviceTimeLabel" hint="e.g. 1.30 H or 6 to 24 H">
          <Input id="serviceTimeLabel" name="serviceTimeLabel" defaultValue={serviceTimeLabel} />
        </Field>
        <Field label="Travel cost (৳)" htmlFor="travelCost">
          <Input id="travelCost" name="travelCost" type="number" min={0} defaultValue={travelCost} />
        </Field>
        <Field label="Internal cost (৳)" htmlFor="internalCost" hint="What this costs Solvex to deliver — never shown to customers.">
          <Input id="internalCost" name="internalCost" type="number" min={0} defaultValue={internalCost} />
        </Field>
      </div>

      <Field label="Technician SOP" htmlFor="sopMd" hint="Step-by-step completion checklist, one step per line. Optional.">
        <Textarea id="sopMd" name="sopMd" defaultValue={sopMd} className="min-h-40" />
      </Field>

      {error && (
        <p role="alert" className="text-[13px] text-[var(--color-danger)]">
          {error}
        </p>
      )}
      {saved && !error && (
        <p role="status" className="text-[13px] text-[var(--color-success)]">
          Costing saved.
        </p>
      )}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save costing'}
        </Button>
      </div>
    </form>
  );
}
