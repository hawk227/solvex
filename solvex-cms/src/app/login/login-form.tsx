'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { signIn } from '@/lib/auth-client';

/** Small uppercase field label, matching the reference layout. */
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

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(undefined);

    const { error: signInError } = await signIn.email({ email, password });

    if (signInError) {
      // Deliberately generic: distinguishing "no such account" from "wrong
      // password" tells an attacker which admin emails exist.
      setError('Incorrect email or password.');
      setPending(false);
      return;
    }

    router.push('/admin/dashboard');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          placeholder="you@solvex.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 rounded-[var(--radius-md)] text-sm"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor="password">Password</FieldLabel>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-11 rounded-[var(--radius-md)] text-sm"
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-[var(--radius-md)] bg-[var(--color-danger)]/8 px-3 py-2 text-[13px] text-[var(--color-danger)]"
        >
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="h-11 w-full justify-center rounded-[var(--radius-md)] text-sm"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
