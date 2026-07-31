'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { signUp } from '@/lib/auth-client';

export function SignupForm({ referralCode }: { referralCode: string | null }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(undefined);

    const { error: signUpError } = await signUp.email({ name, email, password });

    if (signUpError) {
      setPending(false);
      setError(
        signUpError.message ?? 'We could not create that account. Check the details and try again.',
      );
      return;
    }

    // The referral code travels to the verify step so it can be attributed once
    // the address is confirmed — an unverified signup must not earn anyone credit.
    const params = new URLSearchParams({ email });
    if (referralCode) params.set('ref', referralCode);
    router.push(`/verify?${params}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <Field label="Full name" htmlFor="name">
        <Input
          id="name"
          name="name"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>

      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        hint="At least 8 characters."
        error={error}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>

      {referralCode && (
        <p className="rounded-[var(--radius-md)] bg-[var(--color-primary-tint)]/25 px-4 py-3 text-[var(--web-font-size-small)] text-[var(--color-text)]">
          Referral code <strong>{referralCode}</strong> will be applied.
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? 'Creating account…' : 'Create account'}
      </Button>

      <p className="text-[var(--web-font-size-caption)] text-[var(--color-muted)]">
        By creating an account you agree to our terms and privacy policy.
      </p>
    </form>
  );
}
