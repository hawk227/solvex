'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw, Trash2 } from 'lucide-react';
import type { SoftDeletable } from '@solvex/db';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { deleteRecord, restoreRecord } from '@/app/admin/delete-actions';

const NOUN: Record<SoftDeletable, string> = {
  category: 'category',
  service: 'service',
  technician: 'technician',
  employee: 'employee',
};

/**
 * Delete, with a confirmation step.
 *
 * The dialog says plainly that the record is kept, because "delete" otherwise
 * reads as destroying history — and someone who believes that will avoid the
 * button and leave dead records cluttering the lists instead.
 */
export function DeleteButton({
  kind,
  id,
  label,
  extraWarning,
}: {
  kind: SoftDeletable;
  id: number | string;
  label: string;
  /** Consequence specific to this record, e.g. a category taking its services. */
  extraWarning?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function confirm() {
    setPending(true);
    setError(undefined);

    const result = await deleteRecord(kind, id, label);

    setPending(false);
    if (!result.ok) {
      // Kept open: the refusals here (last owner, deleting yourself) are ones
      // the person needs to read, not a toast that vanishes.
      setError(result.error);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(undefined);
      }}
    >
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Delete ${label}`}
        onClick={() => setOpen(true)}
        className="text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <DialogContent
        title={`Delete ${label}?`}
        description={`This ${NOUN[kind]} is removed from the back office and the website. The record itself is kept, so past orders and the activity log still show it, and you can restore it from Deleted records.`}
      >
        {extraWarning && (
          <p className="text-[13px] text-[var(--color-warning)]">{extraWarning}</p>
        )}

        {error && (
          <p role="alert" className="text-[13px] text-[var(--color-danger)]">
            {error}
          </p>
        )}

        <div className="mt-2 flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button
            onClick={confirm}
            disabled={pending}
            className="bg-[var(--color-danger)] hover:bg-[var(--color-danger)]/90"
          >
            {pending ? 'Deleting…' : `Delete ${NOUN[kind]}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Undo a delete. The record comes back inactive — republishing is a separate step. */
export function RestoreButton({
  kind,
  id,
  label,
}: {
  kind: SoftDeletable;
  id: number | string;
  label: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <Button
      variant="secondary"
      disabled={pending}
      aria-label={`Restore ${label}`}
      onClick={async () => {
        setPending(true);
        await restoreRecord(kind, id, label);
        setPending(false);
        router.refresh();
      }}
    >
      <RotateCcw className="h-4 w-4" />
      {pending ? 'Restoring…' : 'Restore'}
    </Button>
  );
}
