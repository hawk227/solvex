'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/input';
import { createTicket } from '../actions';

export type AttachableOrder = {
  code: string;
  serviceName: string;
  scheduledDate: string;
};

const TOPICS = [
  { value: 'BOOKING', label: 'A booking' },
  { value: 'TECHNICIAN', label: 'The technician or the work' },
  { value: 'BILLING', label: 'Payment or price' },
  { value: 'REFERRAL', label: 'Referrals and credit' },
  { value: 'OTHER', label: 'Something else' },
];

export function TicketForm({ orders }: { orders: AttachableOrder[] }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);

    const result = await createTicket(new FormData(e.currentTarget));

    if (!result.ok) {
      setPending(false);
      setError(result.error);
      return;
    }

    router.push(`/support/${result.ref}`);
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 flex max-w-2xl flex-col gap-5">
      <Field label="What is it about?" htmlFor="topic">
        <select
          id="topic"
          name="topic"
          defaultValue="BOOKING"
          className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-[var(--web-font-size-body)] text-[var(--color-text)]"
        >
          {TOPICS.map((topic) => (
            <option key={topic.value} value={topic.value}>
              {topic.label}
            </option>
          ))}
        </select>
      </Field>

      {orders.length > 0 && (
        <Field
          label="Related booking"
          htmlFor="orderCode"
          hint="Optional, but it helps us answer faster."
        >
          <select
            id="orderCode"
            name="orderCode"
            defaultValue=""
            className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-[var(--web-font-size-body)] text-[var(--color-text)]"
          >
            <option value="">Not about a specific booking</option>
            {orders.map((order) => (
              <option key={order.code} value={order.code}>
                {order.code} — {order.serviceName} ({order.scheduledDate})
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label="Subject" htmlFor="subject">
        <Input
          id="subject"
          name="subject"
          required
          maxLength={120}
          placeholder="AC still not cooling after the service"
        />
      </Field>

      <Field label="Tell us what happened" htmlFor="body">
        <Textarea
          id="body"
          name="body"
          required
          rows={7}
          maxLength={4000}
          placeholder="The technician visited on Tuesday and the AC ran fine for a day, but it is warm again."
        />
      </Field>

      {error && (
        <p role="alert" className="text-[var(--web-font-size-small)] text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Sending…' : 'Send to support'}
        </Button>
      </div>
    </form>
  );
}
