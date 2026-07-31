import Link from 'next/link';
import { listCustomerTickets } from '@solvex/db';
import { Container, Section } from '@/components/layout/container';
import { AccountNav } from '@/components/layout/account-nav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/cf';
import { requireCustomer } from '@/lib/session';
import { TICKET_STATUS_LABEL, TICKET_STATUS_TONE, TOPIC_LABEL } from '@/lib/tickets';
import { formatDateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Support' };

export default async function SupportPage() {
  const customer = await requireCustomer('/support');
  const tickets = await listCustomerTickets(db(), customer.id);

  return (
    <main className="flex-1">
      <AccountNav />
      <Section>
        <Container>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-[var(--color-text)] md:text-4xl">
                Support
              </h1>
              <p className="mt-1 text-[var(--web-font-size-small)] text-[var(--color-muted)]">
                Ask us anything about a booking, a technician, or your credit.
              </p>
            </div>
            <Button asChild>
              <Link href="/support/new">Ask for help</Link>
            </Button>
          </div>

          {tickets.length === 0 ? (
            <div className="mt-8 rounded-[var(--web-card-radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center">
              <p className="font-medium">No conversations yet.</p>
              <p className="mt-1 text-[var(--web-font-size-small)] text-[var(--color-muted)]">
                If something is not right with a booking, tell us and we will sort it out.
              </p>
            </div>
          ) : (
            <ul className="mt-8 flex flex-col gap-4">
              {tickets.map((ticket) => (
                <li key={ticket.ref}>
                  <Link
                    href={`/support/${ticket.ref}`}
                    className="block rounded-[var(--web-card-radius)] border border-[var(--color-border)] p-5 transition-shadow duration-[var(--duration-default)] hover:shadow-[var(--shadow-md)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[var(--color-text)]">{ticket.subject}</p>
                        <p className="mt-0.5 text-[var(--web-font-size-small)] text-[var(--color-muted)]">
                          {TOPIC_LABEL[ticket.topic] ?? ticket.topic}
                          {ticket.orderCode ? ` · ${ticket.orderCode}` : ''}
                        </p>
                        <p className="mt-1 text-[var(--web-font-size-caption)] text-[var(--color-muted)]">
                          {ticket.ref} · last activity {formatDateTime(ticket.lastMessageAt)}
                        </p>
                      </div>
                      <Badge tone={TICKET_STATUS_TONE[ticket.status]}>
                        {TICKET_STATUS_LABEL[ticket.status]}
                      </Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Container>
      </Section>
    </main>
  );
}
