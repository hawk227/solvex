'use client';

import { useState, type FormEvent } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/input';
import { createCategory, updateCategory, type ActionResult } from './actions';

export type CategoryRow = {
  id: number;
  name: string;
  description: string | null;
  sort: number;
};

export function CategoryForm({ category }: { category?: CategoryRow }) {
  const editing = Boolean(category);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);

    const data = new FormData(e.currentTarget);
    const result: ActionResult = category
      ? await updateCategory(category.id, data)
      : await createCategory(data);

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
          <Button variant="ghost" size="icon" aria-label={`Edit ${category!.name}`}>
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4" />
            Add category
          </Button>
        )}
      </DialogTrigger>

      <DialogContent
        title={editing ? 'Edit category' : 'New category'}
        description={
          editing
            ? 'The URL slug stays fixed so existing links keep working.'
            : 'Appliance type customers browse, such as Air Conditioner.'
        }
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Name" htmlFor="name">
            <Input
              id="name"
              name="name"
              required
              defaultValue={category?.name ?? ''}
              placeholder="Air Conditioner"
            />
          </Field>

          <Field label="Description" htmlFor="description">
            <Textarea
              id="description"
              name="description"
              defaultValue={category?.description ?? ''}
              placeholder="Optional. Shown on the category page."
            />
          </Field>

          <Field label="Sort order" htmlFor="sort" hint="Lower numbers appear first.">
            <Input
              id="sort"
              name="sort"
              type="number"
              min={0}
              defaultValue={category?.sort ?? 0}
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
              {pending ? 'Saving…' : editing ? 'Save changes' : 'Create category'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
