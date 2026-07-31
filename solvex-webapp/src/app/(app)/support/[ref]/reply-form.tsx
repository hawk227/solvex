'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Field, Textarea } from '@/components/ui/input';
import { replyToTicket } from '../actions';

// Named ticketRef, not ref: React still treats a `ref` prop specially.
export function ReplyForm({ ticketRef }: { ticketRef: string }) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);

    const result = await replyToTicket(ticketRef, new FormData(e.currentTarget));

    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    form.current?.reset();
    router.refresh();
  }

  return (
    <form ref={form} onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
      <Field label="Reply" htmlFor="body">
        <Textarea id="body" name="body" required rows={4} maxLength={4000} />
      </Field>

      {error && (
        <p role="alert" className="text-[var(--web-font-size-small)] text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Sending…' : 'Send reply'}
        </Button>
      </div>
    </form>
  );
}
