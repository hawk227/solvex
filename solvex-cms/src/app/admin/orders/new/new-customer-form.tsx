'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { Geography } from '@solvex/db';
import { Field, Input, Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AddressPicker } from '@/components/ui/address-picker';
import { createWalkInCustomer } from './actions';

export function NewCustomerForm({ phone, geography }: { phone: string; geography: Geography }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);

    const result = await createWalkInCustomer(new FormData(e.currentTarget));
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(`/admin/orders/new?userId=${result.userId}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label="Full name" htmlFor="fullName">
        <Input id="fullName" name="fullName" required />
      </Field>

      <input type="hidden" name="phone" value={phone} />
      <Field label="Phone" htmlFor="phone-display">
        <Input id="phone-display" value={phone} disabled readOnly />
      </Field>

      <Field label="Address" htmlFor="address" hint="House and road number, plus a landmark if it helps.">
        <Textarea id="address" name="address" required minLength={10} maxLength={300} />
      </Field>

      <Field label="Area" htmlFor="areaId">
        <AddressPicker areaSelectId="areaId" geography={geography} initialAreaId={null} initialLocationId={null} />
      </Field>

      {error && (
        <p role="alert" className="text-[13px] text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? 'Creating…' : 'Create customer & continue'}
        </Button>
      </div>
    </form>
  );
}
