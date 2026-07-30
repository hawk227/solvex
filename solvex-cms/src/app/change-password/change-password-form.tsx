'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { changeOwnPassword } from './actions';

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted)]"
    >
      {children}
    </label>
  );
}

export function ChangePasswordForm({ forced }: { forced: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);

    const result = await changeOwnPassword(new FormData(e.currentTarget));

    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push('/admin/dashboard');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor="currentPassword">
          {forced ? 'Temporary password' : 'Current password'}
        </FieldLabel>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          className="h-11 rounded-[var(--radius-md)] text-sm"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor="newPassword">New password</FieldLabel>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          className="h-11 rounded-[var(--radius-md)] text-sm"
        />
        <p className="text-xs text-[var(--color-muted)]">At least 12 characters.</p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-[var(--radius-md)] bg-[var(--color-danger)]/8 px-3 py-2 text-[13px] text-[var(--color-danger)]"
        >
          {error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="h-11 w-full justify-center rounded-[var(--radius-md)] text-sm">
        {pending ? 'Saving…' : 'Set password'}
      </Button>
    </form>
  );
}
