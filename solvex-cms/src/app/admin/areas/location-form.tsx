'use client';

import { useState, type FormEvent } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { createLocation, updateLocation, type ActionResult } from './actions';

export type LocationRow = { id: number; name: string; areaId: number; sort: number };

export function LocationForm({
  areas,
  location,
  /** Preselects the area when adding from within that area's group. */
  defaultAreaId,
}: {
  areas: { id: number; name: string }[];
  location?: LocationRow;
  defaultAreaId?: number;
}) {
  const editing = Boolean(location);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);

    const data = new FormData(e.currentTarget);
    const result: ActionResult = location
      ? await updateLocation(location.id, data)
      : await createLocation(data);

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
          <Button variant="ghost" size="icon" aria-label={`Edit ${location!.name}`}>
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="secondary" size="sm">
            <Plus className="h-4 w-4" />
            Add location
          </Button>
        )}
      </DialogTrigger>

      <DialogContent
        title={editing ? 'Edit location' : 'New location'}
        description="A neighbourhood or landmark inside an area, e.g. Dilkusha within Motijheel. Shown as the last step of the address picker."
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Area" htmlFor="location-area">
            <select
              id="location-area"
              name="areaId"
              required
              defaultValue={location?.areaId ?? defaultAreaId ?? ''}
              className="h-[var(--cms-input-height)] w-full rounded-[var(--cms-control-radius)] border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 text-[13px]"
            >
              <option value="" disabled>
                Choose an area
              </option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Location name" htmlFor="location-name">
            <Input
              id="location-name"
              name="name"
              required
              defaultValue={location?.name ?? ''}
              placeholder="Dilkusha"
            />
          </Field>

          <Field label="Sort order" htmlFor="location-sort" hint="Lower numbers appear first.">
            <Input
              id="location-sort"
              name="sort"
              type="number"
              min={0}
              defaultValue={location?.sort ?? 0}
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
              {pending ? 'Saving…' : editing ? 'Save changes' : 'Create location'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
