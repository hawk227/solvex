'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea, Label } from '@/components/ui/input';
import { createService, updateServiceBasics, type ActionResult } from './actions';

export type ServiceRow = {
  id: number;
  categoryId: number;
  name: string;
  shortDesc: string | null;
  durationMin: number | null;
  sort: number;
};

export function ServiceForm({
  categories,
  service,
}: {
  categories: { id: number; name: string }[];
  service?: ServiceRow;
}) {
  const editing = Boolean(service);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);

    const data = new FormData(e.currentTarget);
    const result: ActionResult = service
      ? await updateServiceBasics(service.id, data)
      : await createService(data);

    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);

    // A new service still needs its content and price matrix, so go straight
    // to the editor rather than leaving it half-configured in the list.
    if (!editing && result.id) router.push(`/admin/services/${result.id}`);
  }

  if (categories.length === 0) {
    return (
      <Button disabled title="Create a category first">
        <Plus className="h-4 w-4" />
        Add service
      </Button>
    );
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
          <Button variant="ghost" size="icon" aria-label={`Edit ${service!.name}`}>
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4" />
            Add service
          </Button>
        )}
      </DialogTrigger>

      <DialogContent
        title={editing ? 'Edit service' : 'New service'}
        description={
          editing
            ? 'The URL slug stays fixed so existing links keep working.'
            : 'You will set content, variables and pricing next.'
        }
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="svc-category">Category</Label>
            <select
              id="svc-category"
              name="categoryId"
              required
              defaultValue={service?.categoryId ?? categories[0]?.id}
              className="h-[var(--cms-input-height)] rounded-[var(--cms-control-radius)] border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 text-[13px] text-[var(--color-text)]"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <Field label="Name" htmlFor="svc-name">
            <Input
              id="svc-name"
              name="name"
              required
              defaultValue={service?.name ?? ''}
              placeholder="AC Cleaning"
            />
          </Field>

          <Field label="Short description" htmlFor="svc-desc">
            <Textarea
              id="svc-desc"
              name="shortDesc"
              defaultValue={service?.shortDesc ?? ''}
              placeholder="One line shown in service listings."
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Duration (min)" htmlFor="svc-duration" hint="Optional.">
              <Input
                id="svc-duration"
                name="durationMin"
                type="number"
                min={0}
                max={1440}
                defaultValue={service?.durationMin ?? ''}
              />
            </Field>
            <Field label="Sort order" htmlFor="svc-sort">
              <Input
                id="svc-sort"
                name="sort"
                type="number"
                min={0}
                defaultValue={service?.sort ?? 0}
              />
            </Field>
          </div>

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
              {pending ? 'Saving…' : editing ? 'Save changes' : 'Create service'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
