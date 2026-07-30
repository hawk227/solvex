'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { saveProfile } from './actions';

type Profile = {
  fullName: string;
  phone: string;
  address: string;
  areaId: number | null;
};

function safeNext(next: string | null): string {
  if (!next) return '/account';
  if (!next.startsWith('/') || next.startsWith('//')) return '/account';
  return next;
}

export function ProfileForm({
  areas,
  profile,
  next,
  defaultName,
}: {
  areas: { id: number; name: string }[];
  profile: Profile | null;
  next: string | null;
  defaultName: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);

    const result = await saveProfile(new FormData(e.currentTarget));

    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.push(safeNext(next));
    router.refresh();
  }

  if (areas.length === 0) {
    return (
      <p className="text-[var(--color-muted)]">
        We are not accepting bookings in any area right now. Please check back shortly.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <Field label="Full name" htmlFor="fullName">
        <Input
          id="fullName"
          name="fullName"
          autoComplete="name"
          required
          defaultValue={profile?.fullName ?? defaultName}
        />
      </Field>

      <Field
        label="Mobile number"
        htmlFor="phone"
        hint="The technician calls this number before arriving."
      >
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          placeholder="01712345678"
          defaultValue={profile?.phone ?? ''}
        />
      </Field>

      <Field label="Area" htmlFor="areaId">
        <Select id="areaId" name="areaId" required defaultValue={profile?.areaId ?? ''}>
          <option value="" disabled>
            Choose your area
          </option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Full address"
        htmlFor="address"
        hint="House and road number, plus a landmark if it helps."
        error={error}
      >
        <Textarea
          id="address"
          name="address"
          required
          minLength={10}
          placeholder="House 12, Road 4, Dhanmondi — beside the pharmacy"
          defaultValue={profile?.address ?? ''}
        />
      </Field>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? 'Saving…' : profile ? 'Save changes' : 'Save and continue'}
      </Button>
    </form>
  );
}
