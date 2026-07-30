'use client';

import { useState, type FormEvent } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { createSlot, updateSlot, type ActionResult } from './actions';

export type SlotRow = {
  id: number;
  label: string;
  startTime: string;
  endTime: string;
  sort: number;
};

export function SlotForm({ slot }: { slot?: SlotRow }) {
  const editing = Boolean(slot);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);

    const data = new FormData(e.currentTarget);
    const result: ActionResult = slot ? await updateSlot(slot.id, data) : await createSlot(data);

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
          <Button variant="ghost" size="icon" aria-label={`Edit ${slot!.label}`}>
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4" />
            Add slot
          </Button>
        )}
      </DialogTrigger>

      <DialogContent
        title={editing ? 'Edit slot' : 'New booking slot'}
        description="Times are Asia/Dhaka. Customers pick one of these windows when booking."
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Label" htmlFor="slot-label" hint="Shown to customers, e.g. 9:00 AM - 12:00 PM.">
            <Input
              id="slot-label"
              name="label"
              required
              defaultValue={slot?.label ?? ''}
              placeholder="9:00 AM - 12:00 PM"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Start" htmlFor="slot-start">
              <Input
                id="slot-start"
                name="startTime"
                type="time"
                required
                defaultValue={slot?.startTime ?? '09:00'}
              />
            </Field>
            <Field label="End" htmlFor="slot-end">
              <Input
                id="slot-end"
                name="endTime"
                type="time"
                required
                defaultValue={slot?.endTime ?? '12:00'}
              />
            </Field>
          </div>

          <Field label="Sort order" htmlFor="slot-sort" hint="Lower numbers appear first.">
            <Input id="slot-sort" name="sort" type="number" min={0} defaultValue={slot?.sort ?? 0} />
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
              {pending ? 'Saving…' : editing ? 'Save changes' : 'Create slot'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
