'use client';

import { useState, type FormEvent } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea, Label } from '@/components/ui/input';
import { createTechnician, updateTechnician, type ActionResult } from './actions';

export type TechnicianRow = {
  id: number;
  fullName: string;
  phone: string;
  email: string | null;
  baseArea: string | null;
  joinedOn: string | null;
  notes: string | null;
  categoryIds: number[];
  areaIds: number[];
};

/** Multi-select as a checkbox group: a handful of options, no search needed. */
function CheckGroup({
  legend,
  name,
  options,
  selected,
  emptyHint,
}: {
  legend: string;
  name: string;
  options: { id: number; name: string }[];
  selected: number[];
  emptyHint: string;
}) {
  if (options.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${name}-none`}>{legend}</Label>
        <p id={`${name}-none`} className="text-xs text-[var(--color-muted)]">
          {emptyHint}
        </p>
      </div>
    );
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-[13px] font-medium text-[var(--color-text)]">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.id}
            className="inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--color-border)] px-3 py-1.5 text-[13px] transition-colors duration-[var(--duration-hover)] hover:border-[var(--color-primary)] has-[:checked]:border-[var(--color-primary)] has-[:checked]:bg-[var(--color-primary-tint)]/25 has-[:checked]:text-[var(--color-primary)]"
          >
            <input
              type="checkbox"
              name={name}
              value={option.id}
              defaultChecked={selected.includes(option.id)}
              className="h-3.5 w-3.5 accent-[var(--color-primary)]"
            />
            {option.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function TechnicianForm({
  categories,
  areas,
  technician,
}: {
  categories: { id: number; name: string }[];
  areas: { id: number; name: string }[];
  technician?: TechnicianRow;
}) {
  const editing = Boolean(technician);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);

    const data = new FormData(e.currentTarget);
    const result: ActionResult = technician
      ? await updateTechnician(technician.id, data)
      : await createTechnician(data);

    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(undefined);
      }}
    >
      <DialogTrigger asChild>
        {editing ? (
          <Button variant="ghost" size="icon" aria-label={`Edit ${technician!.fullName}`}>
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4" />
            Onboard technician
          </Button>
        )}
      </DialogTrigger>

      <DialogContent
        title={editing ? 'Edit technician' : 'Onboard a technician'}
        description="Skills and areas guide dispatch. They do not block it — you can always assign anyone."
        className="max-w-[560px]"
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Full name" htmlFor="tech-name">
            <Input
              id="tech-name"
              name="fullName"
              required
              defaultValue={technician?.fullName ?? ''}
              placeholder="Karim Uddin"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Mobile" htmlFor="tech-phone" hint="Used for dispatch.">
              <Input
                id="tech-phone"
                name="phone"
                type="tel"
                required
                defaultValue={technician?.phone ?? ''}
                placeholder="01712345678"
              />
            </Field>
            <Field label="Email" htmlFor="tech-email" hint="Optional.">
              <Input
                id="tech-email"
                name="email"
                type="email"
                defaultValue={technician?.email ?? ''}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Based in" htmlFor="tech-base" hint="Optional. Free text.">
              <Input
                id="tech-base"
                name="baseArea"
                defaultValue={technician?.baseArea ?? ''}
                placeholder="Mirpur"
              />
            </Field>
            <Field label="Joined on" htmlFor="tech-joined" hint="Optional.">
              <Input
                id="tech-joined"
                name="joinedOn"
                type="date"
                defaultValue={technician?.joinedOn ?? ''}
              />
            </Field>
          </div>

          <CheckGroup
            legend="Skills"
            name="categoryIds"
            options={categories}
            selected={technician?.categoryIds ?? []}
            emptyHint="Add a category first to record skills."
          />

          <CheckGroup
            legend="Areas covered"
            name="areaIds"
            options={areas}
            selected={technician?.areaIds ?? []}
            emptyHint="Add a service area first."
          />

          <Field label="Notes" htmlFor="tech-notes" hint="Optional. Internal only.">
            <Textarea
              id="tech-notes"
              name="notes"
              defaultValue={technician?.notes ?? ''}
              placeholder="Has own tools. Prefers morning slots."
            />
          </Field>

          {error && (
            <p role="alert" className="text-[13px] text-[var(--color-danger)]">
              {error}
            </p>
          )}

          <div className="mt-1 flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : editing ? 'Save changes' : 'Onboard technician'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
