'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ImageIcon, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field, Input, Label, Textarea } from '@/components/ui/input';
import { MAX_IMAGE_BYTES, validateImage } from '@/lib/upload';
import { removeImage, uploadImage } from '@/app/admin/image-actions';
import { createCategory, updateCategory, type ActionResult } from './actions';

export type CategoryRow = {
  id: number;
  name: string;
  description: string | null;
  sort: number;
  imageUrl: string | null;
};

export function CategoryForm({ category }: { category?: CategoryRow }) {
  const editing = Boolean(category);
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  /**
   * The chosen file waits here until there is a record to attach it to.
   *
   * The R2 key contains the category id, which does not exist until the row is
   * inserted — so the upload genuinely cannot happen first. That is a database
   * detail though, not something an admin should have to work around, so the
   * file is held and sent the moment the id comes back.
   */
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(category?.imageUrl ?? null);
  const [removeExisting, setRemoveExisting] = useState(false);

  async function pickFile(next: File | undefined) {
    if (!next) return;
    setError(undefined);

    if (next.size > MAX_IMAGE_BYTES) {
      setError('Images must be 5 MB or smaller.');
      return;
    }

    // Sniffed here too so an obviously wrong file is caught before upload. The
    // server-side check is still the one that decides.
    const check = validateImage(new Uint8Array(await next.arrayBuffer()));
    if (!check.ok) {
      setError(check.error);
      return;
    }

    setFile(next);
    setRemoveExisting(false);
    setPreview(URL.createObjectURL(next));
  }

  function reset() {
    setFile(null);
    setRemoveExisting(false);
    setPreview(category?.imageUrl ?? null);
    setError(undefined);
    if (fileInput.current) fileInput.current.value = '';
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);

    const data = new FormData(e.currentTarget);
    const result: ActionResult = category
      ? await updateCategory(category.id, data)
      : await createCategory(data);

    if (!result.ok) {
      setPending(false);
      setError(result.error);
      return;
    }

    const id = category?.id ?? result.id;

    if (id !== undefined) {
      if (removeExisting && !file) {
        await removeImage('categories', id);
      } else if (file) {
        const upload = new FormData();
        upload.set('file', file);
        const uploaded = await uploadImage('categories', id, upload);
        if (!uploaded.ok) {
          // The category itself saved. Say exactly that rather than implying the
          // whole thing failed and inviting a duplicate attempt.
          setPending(false);
          setError(`Category saved, but the image did not upload: ${uploaded.error}`);
          router.refresh();
          return;
        }
      }
    }

    setPending(false);
    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
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

          <div className="flex flex-col gap-2">
            <Label htmlFor="category-image">Image</Label>
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
                {preview && !removeExisting ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon aria-hidden className="h-6 w-6 text-[var(--color-muted)]" />
                )}
              </div>

              <div className="flex flex-col gap-2">
                <input
                  ref={fileInput}
                  id="category-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => void pickFile(e.target.files?.[0])}
                />
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => fileInput.current?.click()}
                    disabled={pending}
                  >
                    <Upload className="h-4 w-4" />
                    {preview && !removeExisting ? 'Replace' : 'Choose image'}
                  </Button>
                  {preview && !removeExisting && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remove image"
                      disabled={pending}
                      onClick={() => {
                        setFile(null);
                        setPreview(null);
                        setRemoveExisting(Boolean(category?.imageUrl));
                        if (fileInput.current) fileInput.current.value = '';
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-[var(--color-muted)]">
                  JPEG, PNG or WebP. Up to 5 MB.
                  {!editing && ' Uploaded once the category is created.'}
                </p>
              </div>
            </div>
          </div>

          <Field label="Sort order" htmlFor="sort" hint="Lower numbers appear first.">
            <Input id="sort" name="sort" type="number" min={0} defaultValue={category?.sort ?? 0} />
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
