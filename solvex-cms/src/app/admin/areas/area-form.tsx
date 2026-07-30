'use client';

import { useState, type FormEvent } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { createArea, updateArea, type ActionResult } from './actions';

export type AreaRow = { id: number; name: string; sort: number };

export function AreaForm({ area }: { area?: AreaRow }) {
  const editing = Boolean(area);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);

    const data = new FormData(e.currentTarget);
    const result: ActionResult = area ? await updateArea(area.id, data) : await createArea(data);

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
          <Button variant="ghost" size="icon" aria-label={`Edit ${area!.name}`}>
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4" />
            Add area
          </Button>
        )}
      </DialogTrigger>

      <DialogContent
        title={editing ? 'Edit area' : 'New service area'}
        description="Customers can only book from areas that are active here."
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Area name" htmlFor="area-name">
            <Input
              id="area-name"
              name="name"
              required
              defaultValue={area?.name ?? ''}
              placeholder="Dhanmondi"
            />
          </Field>

          <Field label="Sort order" htmlFor="area-sort" hint="Lower numbers appear first.">
            <Input id="area-sort" name="sort" type="number" min={0} defaultValue={area?.sort ?? 0} />
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
              {pending ? 'Saving…' : editing ? 'Save changes' : 'Create area'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
