'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Send } from 'lucide-react';
import { postReply } from '../actions';

export function ReplyBox({ ticketId, closed }: { ticketId: number; closed: boolean }) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [internal, setInternal] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);

    const result = await postReply(ticketId, new FormData(e.currentTarget));

    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    form.current?.reset();
    setInternal(false);
    router.refresh();
  }

  return (
    <form ref={form} onSubmit={onSubmit} className="flex flex-col gap-3">
      {/*
        The whole box changes colour when the note is internal. A checkbox alone
        is far too quiet for a control that decides whether the customer reads
        what you are typing about them.
      */}
      <div
        className={
          internal
            ? 'rounded-[var(--radius-md)] border-2 border-[var(--color-warning)] bg-[var(--color-warning)]/5 p-3'
            : 'rounded-[var(--radius-md)] border border-[var(--color-border)] p-3'
        }
      >
        <label htmlFor="reply-body" className="sr-only">
          {internal ? 'Internal note' : 'Reply to the customer'}
        </label>
        <textarea
          id="reply-body"
          name="body"
          required
          rows={5}
          maxLength={4000}
          placeholder={
            internal ? 'Only staff will see this.' : 'Written to the customer as SolveX.'
          }
          className="w-full resize-y bg-transparent text-[13px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-muted)]"
        />

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-2">
          <label className="flex cursor-pointer items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              name="internal"
              checked={internal}
              onChange={(e) => setInternal(e.target.checked)}
              className="h-4 w-4 accent-[var(--color-warning)]"
            />
            <Lock aria-hidden className="h-3.5 w-3.5 text-[var(--color-muted)]" />
            Internal note — the customer will not see this
          </label>

          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-[var(--cms-control-height)] items-center gap-2 rounded-[var(--cms-control-radius)] bg-[var(--color-primary)] px-4 text-[13px] font-medium text-[var(--color-primary-foreground)] transition-colors duration-[var(--duration-hover)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
          >
            <Send aria-hidden className="h-3.5 w-3.5" />
            {pending ? 'Sending…' : internal ? 'Add note' : 'Send reply'}
          </button>
        </div>
      </div>

      {closed && !internal && (
        <p className="text-[13px] text-[var(--color-muted)]">
          This ticket is closed, so the customer cannot reply back.
        </p>
      )}

      {error && (
        <p role="alert" className="text-[13px] text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </form>
  );
}
