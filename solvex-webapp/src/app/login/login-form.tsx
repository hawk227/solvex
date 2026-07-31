'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { signIn } from '@/lib/auth-client';

/** Only same-origin paths are accepted, so ?next= cannot become an open redirect. */
function safeNext(next: string | null): string {
  if (!next) return '/dashboard';
  if (!next.startsWith('/') || next.startsWith('//')) return '/dashboard';
  return next;
}

export function LoginForm({ next }: { next: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [needsVerify, setNeedsVerify] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    setNeedsVerify(false);

    const { error: signInError } = await signIn.email({ email, password });

    if (signInError) {
      setPending(false);
      // An unverified address is a distinct, actionable state, so it is worth
      // telling the user. Everything else stays generic: distinguishing "no such
      // account" from "wrong password" reveals which emails are registered.
      if (signInError.status === 403) {
        setNeedsVerify(true);
        return;
      }
      setError('Incorrect email or password.');
      return;
    }

    router.push(safeNext(next));
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>

      <Field label="Password" htmlFor="password" error={error}>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>

      {needsVerify && (
        <p role="alert" className="rounded-[var(--radius-md)] bg-[var(--color-surface)] px-4 py-3 text-[var(--web-font-size-small)]">
          This email is not confirmed yet.{' '}
          <Link
            href={`/verify?email=${encodeURIComponent(email)}`}
            className="font-medium text-[var(--color-primary)] hover:underline"
          >
            Enter your code
          </Link>
          .
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? 'Logging in…' : 'Log in'}
      </Button>

      <Link
        href="/forgot-password"
        className="text-center text-[var(--web-font-size-small)] text-[var(--color-muted)] hover:text-[var(--color-primary)]"
      >
        Forgot your password?
      </Link>
    </form>
  );
}
