'use client';

import { useRef, useState, useTransition } from 'react';
import { ImageIcon, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { removeImage, uploadImage } from '@/app/admin/image-actions';

export function ImageUpload({
  target,
  id,
  imageUrl,
  label,
  /** Thumbnail-only variant for table cells: no hint text, smaller preview. */
  compact = false,
}: {
  target: 'categories' | 'services';
  id: number;
  imageUrl: string | null;
  label: string;
  compact?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [removing, startRemoving] = useTransition();

  async function onPick(file: File | undefined) {
    if (!file) return;
    setPending(true);
    setError(undefined);

    const data = new FormData();
    data.set('file', file);
    const result = await uploadImage(target, id, data);

    setPending(false);
    if (input.current) input.current.value = '';
    if (!result.ok) setError(result.error);
  }

  if (compact) {
    return (
      <div className="flex flex-col gap-1">
        <button
          type="button"
          disabled={pending}
          onClick={() => input.current?.click()}
          aria-label={imageUrl ? `Replace ${label} image` : `Upload ${label} image`}
          className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] transition-colors duration-[var(--duration-hover)] hover:border-[var(--color-primary)] disabled:opacity-50"
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon aria-hidden className="h-4 w-4 text-[var(--color-muted)]" />
          )}
        </button>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => void onPick(e.target.files?.[0])}
        />
        {error && (
          <p role="alert" className="max-w-32 text-xs text-[var(--color-danger)]">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
          {imageUrl ? (
            // Plain <img>: the file lives on the R2 public domain, and the
            // Next image optimiser is not wired for it.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={`${label} image`} className="h-full w-full object-cover" />
          ) : (
            <ImageIcon aria-hidden className="h-6 w-6 text-[var(--color-muted)]" />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            id={`upload-${target}-${id}`}
            onChange={(e) => void onPick(e.target.files?.[0])}
          />
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => input.current?.click()}
            >
              <Upload className="h-4 w-4" />
              {pending ? 'Uploading…' : imageUrl ? 'Replace' : 'Upload image'}
            </Button>
            {imageUrl && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove ${label} image`}
                disabled={removing}
                onClick={() => startRemoving(() => void removeImage(target, id))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-xs text-[var(--color-muted)]">JPEG, PNG or WebP. Up to 5 MB.</p>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-[13px] text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  );
}
