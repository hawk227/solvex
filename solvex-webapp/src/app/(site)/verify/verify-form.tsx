'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { emailOtp } from '@/lib/auth-client';
import { attachReferral } from './actions';

export function VerifyForm({
  email: initialEmail,
  referralCode,
}: {
  email: string;
  referralCode: string | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [pending, setPending] = useState(false);
  const [resending, setResending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    setNotice(undefined);

    const { error: verifyError } = await emailOtp.verifyEmail({ email, otp: code });

    if (verifyError) {
      setPending(false);
      setError('That code is wrong or has expired. Request a new one below.');
      return;
    }

    // Attribution happens only after the address is confirmed, so an unverified
    // signup cannot earn anyone referral credit.
    if (referralCode) await attachReferral(referralCode);

    router.push('/profile/complete');
    router.refresh();
  }

  async function resend() {
    setResending(true);
    setError(undefined);
    setNotice(undefined);
    const { error: sendError } = await emailOtp.sendVerificationOtp({
      email,
      type: 'email-verification',
    });
    setResending(false);
    setNotice(sendError ? undefined : 'A new code is on its way.');
    if (sendError) setError('We could not send a new code. Check the address and try again.');
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>

      <Field label="Verification code" htmlFor="code" error={error}>
        <Input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          required
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          className="text-center text-2xl tracking-[0.4em]"
        />
      </Field>

      {notice && (
        <p role="status" className="text-[var(--web-font-size-small)] text-[var(--color-success)]">
          {notice}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending || code.length !== 6}>
        {pending ? 'Confirming…' : 'Confirm email'}
      </Button>

      <Button type="button" variant="ghost" onClick={resend} disabled={resending}>
        {resending ? 'Sending…' : 'Send a new code'}
      </Button>
    </form>
  );
}
