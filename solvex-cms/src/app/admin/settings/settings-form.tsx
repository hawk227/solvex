'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { saveSettings } from './actions';

export function SettingsForm({
  defaultSlotCapacity,
  referralRewardTaka,
}: {
  defaultSlotCapacity: number;
  referralRewardTaka: number;
}) {
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    setSaved(false);

    const result = await saveSettings(new FormData(e.currentTarget));

    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-5">
      <Field
        label="Default slot capacity"
        htmlFor="default_slot_capacity"
        hint="Bookings allowed per slot per day, unless a date has an override."
      >
        <Input
          id="default_slot_capacity"
          name="default_slot_capacity"
          type="number"
          min={0}
          max={999}
          required
          defaultValue={defaultSlotCapacity}
        />
      </Field>

      <Field
        label="Referral reward (৳)"
        htmlFor="referral_reward_taka"
        hint="Credited to the referrer when their referee's first order is completed."
      >
        <Input
          id="referral_reward_taka"
          name="referral_reward_taka"
          type="number"
          min={0}
          max={100000}
          required
          defaultValue={referralRewardTaka}
        />
      </Field>

      {error && (
        <p role="alert" className="text-[13px] text-[var(--color-danger)]">
          {error}
        </p>
      )}
      {saved && !error && (
        <p role="status" className="text-[13px] text-[var(--color-success)]">
          Settings saved.
        </p>
      )}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save settings'}
        </Button>
      </div>
    </form>
  );
}
