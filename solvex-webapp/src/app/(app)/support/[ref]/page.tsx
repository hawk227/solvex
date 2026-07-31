import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCustomerTicketMessages } from '@solvex/db';
import { Container, Section } from '@/components/layout/container';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/cf';
import { requireCustomer } from '@/lib/session';
import { getCustomerTicket, TICKET_STATUS_LABEL, TICKET_STATUS_TONE, TOPIC_LABEL } from '@/lib/tickets';
import { formatDateTime } from '@/lib/format';
import { ReplyForm } from './reply-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Support conversation' };

export default async function TicketPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const customer = await requireCustomer(`/support/${ref}`);

  const ticket = await getCustomerTicket(customer.id, ref);
  if (!ticket) notFound();

  /*
   * The customer read, which excludes internal notes in the query itself. Never
   * swap this for the staff read — staff discuss the customer in this thread.
   */
  const messages = await getCustomerTicketMessages(db(), customer.id, ref);
  if (!messages) notFound();

  return (
    <main className="flex-1">
      <Section>
        <Container className="max-w-3xl">
          <Link
            href="/support"
            className="text-[var(--web-font-size-small)] text-[var(--color-muted)] hover:text-[var(--color-text)]"
          >
            ← Support
          </Link>

          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-[var(--color-text)] md:text-3xl">
                {ticket.subject}
              </h1>
              <p className="mt-1 text-[var(--web-font-size-small)] text-[var(--color-muted)]">
                {ticket.ref} · {TOPIC_LABEL[ticket.topic] ?? ticket.topic}
                {ticket.orderCode ? ' · ' : ''}
                {ticket.orderCode && (
                  <Link href={`/orders/${ticket.orderCode}`} className="underline">
                    {ticket.orderCode}
                  </Link>
                )}
              </p>
            </div>
            <Badge tone={TICKET_STATUS_TONE[ticket.status]}>
              {TICKET_STATUS_LABEL[ticket.status]}
            </Badge>
          </div>

          <ul className="mt-8 flex flex-col gap-4">
            {messages.map((message, i) => {
              const fromUs = message.authorType === 'STAFF';
              return (
                <li
                  key={i}
                  className={
                    fromUs
                      ? 'rounded-[var(--web-card-radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5'
                      : 'rounded-[var(--web-card-radius)] border border-[var(--color-border)] p-5'
                  }
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-[var(--web-font-size-small)] font-semibold text-[var(--color-text)]">
                      {fromUs ? `${message.authorName} · SolveX` : 'You'}
                    </p>
                    <p className="text-[var(--web-font-size-caption)] text-[var(--color-muted)]">
                      {formatDateTime(message.createdAt)}
                    </p>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-[var(--web-font-size-body)] text-[var(--color-text)]">
                    {message.body}
                  </p>
                </li>
              );
            })}
          </ul>

          {ticket.status === 'CLOSED' ? (
            <p className="mt-6 rounded-[var(--web-card-radius)] border border-[var(--color-border)] p-5 text-[var(--web-font-size-small)] text-[var(--color-muted)]">
              This conversation is closed.{' '}
              <Link href="/support/new" className="underline">
                Open a new one
              </Link>{' '}
              if you still need help.
            </p>
          ) : (
            <ReplyForm ticketRef={ticket.ref} />
          )}
        </Container>
      </Section>
    </main>
  );
}
