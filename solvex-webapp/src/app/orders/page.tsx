import Link from 'next/link';
import { Container, Section } from '@/components/layout/container';
import { AccountNav } from '@/components/layout/account-nav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { requireCustomer } from '@/lib/session';
import { listCustomerOrders, STATUS_LABEL, STATUS_TONE } from '@/lib/orders';
import { formatDate, formatTaka } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your bookings' };

export default async function OrdersPage() {
  const customer = await requireCustomer('/orders');
  const orders = await listCustomerOrders(customer.id);

  return (
    <main className="flex-1">
      <AccountNav />
      <Section>
        <Container>
          <h1 className="text-3xl font-semibold text-[var(--color-text)] md:text-4xl">
            Your bookings
          </h1>

          {orders.length === 0 ? (
            <div className="mt-8 rounded-[var(--web-card-radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center">
              <p className="font-medium">No bookings yet.</p>
              <p className="mt-1 text-[var(--web-font-size-small)] text-[var(--color-muted)]">
                Pick a service and choose a time that suits you.
              </p>
              <Button asChild className="mt-5">
                <Link href="/services">Browse services</Link>
              </Button>
            </div>
          ) : (
            <ul className="mt-8 flex flex-col gap-4">
              {orders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/orders/${order.code}`}
                    className="block rounded-[var(--web-card-radius)] border border-[var(--color-border)] p-5 transition-shadow duration-[var(--duration-default)] hover:shadow-[var(--shadow-md)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[var(--color-text)]">
                          {order.serviceName}
                        </p>
                        <p className="mt-0.5 text-[var(--web-font-size-small)] text-[var(--color-muted)]">
                          {formatDate(order.scheduledDate)} · {order.slotLabel}
                        </p>
                        <p className="mt-1 text-[var(--web-font-size-caption)] text-[var(--color-muted)]">
                          {order.code}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge tone={STATUS_TONE[order.status]}>
                          {STATUS_LABEL[order.status]}
                        </Badge>
                        <span className="font-bold">{formatTaka(order.total)}</span>
                      </div>
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
