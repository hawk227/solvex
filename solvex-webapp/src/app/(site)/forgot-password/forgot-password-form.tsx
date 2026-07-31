'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { emailOtp } from '@/lib/auth-client';

export function ForgotPasswordForm() {
  const router = useRouter();
  const [stage, setStage] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function request(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(undefined);

    // Same OTP machinery as signup verification, with the reset type so the
    // email body and the code's purpose match.
    await emailOtp.sendVerificationOtp({ email, type: 'forget-password' });

    // Always advance, whatever the result. Reporting "no such account" here
    // would turn this form into a way to test which emails are registered.
    setPending(false);
    setStage('reset');
  }

  async function reset(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(undefined);

    const { error: resetError } = await emailOtp.resetPassword({
      email,
      otp: code,
      password,
    });

    setPending(false);
    if (resetError) {
      setError('That code is wrong or has expired. Request a new one.');
      return;
    }

    router.push('/login');
  }

  if (stage === 'request') {
    return (
      <form onSubmit={request} className="flex flex-col gap-5">
        <Field label="Email" htmlFor="email" error={error}>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? 'Sending…' : 'Send reset code'}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={reset} className="flex flex-col gap-5">
      <p className="text-[var(--web-font-size-small)] text-[var(--color-muted)]">
        If an account exists for <strong className="text-[var(--color-text)]">{email}</strong>, a
        code is on its way.
      </p>

      <Field label="Reset code" htmlFor="code">
        <Input
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          className="text-center text-2xl tracking-[0.4em]"
        />
      </Field>

      <Field label="New password" htmlFor="password" hint="At least 8 characters." error={error}>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>

      <Button type="submit" size="lg" disabled={pending || code.length !== 6}>
        {pending ? 'Updating…' : 'Set new password'}
      </Button>
    </form>
  );
}
