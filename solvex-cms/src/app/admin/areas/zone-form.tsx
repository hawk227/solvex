'use client';

import { useState, type FormEvent } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { createZone, updateZone, type ActionResult } from './actions';

export type ZoneRow = { id: number; name: string; sort: number };

export function ZoneForm({ zone }: { zone?: ZoneRow }) {
  const editing = Boolean(zone);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);

    const data = new FormData(e.currentTarget);
    const result: ActionResult = zone ? await updateZone(zone.id, data) : await createZone(data);

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
          <Button variant="ghost" size="icon" aria-label={`Edit ${zone!.name}`}>
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4" />
            Add zone
          </Button>
        )}
      </DialogTrigger>

      <DialogContent
        title={editing ? 'Edit zone' : 'New zone'}
        description="Groups areas for the address picker, e.g. Central Dhaka, Old Dhaka. Purely organisational — it does not affect booking eligibility."
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Zone name" htmlFor="zone-name">
            <Input
              id="zone-name"
              name="name"
              required
              defaultValue={zone?.name ?? ''}
              placeholder="Central Dhaka"
            />
          </Field>

          <Field label="Sort order" htmlFor="zone-sort" hint="Lower numbers appear first.">
            <Input id="zone-sort" name="sort" type="number" min={0} defaultValue={zone?.sort ?? 0} />
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
              {pending ? 'Saving…' : editing ? 'Save changes' : 'Create zone'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
