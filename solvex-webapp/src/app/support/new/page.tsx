import Link from 'next/link';
import { Container, Section } from '@/components/layout/container';
import { requireCustomer } from '@/lib/session';
import { getAttachableOrders } from '@/lib/tickets';
import { TicketForm } from './ticket-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ask for help' };

export default async function NewTicketPage() {
  const customer = await requireCustomer('/support/new');
  const orders = await getAttachableOrders(customer.id);

  return (
    <main className="flex-1">
      <Section>
        <Container>
          <Link
            href="/support"
            className="text-[var(--web-font-size-small)] text-[var(--color-muted)] hover:text-[var(--color-text)]"
          >
            ← Support
          </Link>
          <h1 className="mt-3 text-3xl font-semibold text-[var(--color-text)] md:text-4xl">
            Ask for help
          </h1>
          <p className="mt-1 text-[var(--web-font-size-small)] text-[var(--color-muted)]">
            We reply here, and you will see it on this page.
          </p>

          <TicketForm orders={orders} />
        </Container>
      </Section>
    </main>
  );
}
