'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cancelOrder } from './actions';

export function CancelOrder({ code, canCancel }: { code: string; canCancel: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  if (!canCancel) {
    return (
      <p className="text-[var(--web-font-size-small)] text-[var(--color-muted)]">
        The technician is on the way. Please call us if you need to cancel.
      </p>
    );
  }

  async function confirm() {
    setPending(true);
    setError(undefined);
    const result = await cancelOrder(code);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setConfirming(false);
    router.refresh();
  }

  return (
    <div className="rounded-[var(--web-card-radius)] border border-[var(--color-border)] p-6">
      <h2 className="font-bold text-[var(--color-text)]">Need to cancel?</h2>
      <p className="mt-2 text-[var(--web-font-size-small)] text-[var(--color-muted)]">
        Free to cancel until the technician sets off. Any credit you used is returned.
      </p>

      {confirming ? (
        <div className="mt-4 flex flex-col gap-2">
          <p className="text-[var(--web-font-size-small)] font-medium">
            Cancel this booking?
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setConfirming(false)} disabled={pending}>
              Keep it
            </Button>
            <Button
              onClick={confirm}
              disabled={pending}
              className="bg-[var(--color-danger)] hover:opacity-90"
            >
              {pending ? 'Cancelling…' : 'Yes, cancel'}
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" className="mt-4" onClick={() => setConfirming(true)}>
          Cancel booking
        </Button>
      )}

      {error && (
        <p role="alert" className="mt-3 text-[var(--web-font-size-small)] text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  );
}
