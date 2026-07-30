import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check, CircleDashed } from 'lucide-react';
import { Container, Section } from '@/components/layout/container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { requireCustomer } from '@/lib/session';
import {
  getCustomerOrder,
  getOrderEvents,
  STATUS_FLOW,
  STATUS_LABEL,
  STATUS_TONE,
} from '@/lib/orders';
import { formatDate, formatDateTime, formatTaka } from '@/lib/format';
import { CancelOrder } from './cancel-order';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps<'/orders/[code]'>) {
  const { code } = await params;
  return { title: `Booking ${code}` };
}

export default async function OrderPage({ params, searchParams }: PageProps<'/orders/[code]'>) {
  const customer = await requireCustomer();
  const { code } = await params;
  const sp = await searchParams;

  // Scoped to the signed-in customer: a guessed code must not reveal someone
  // else's name, phone and home address.
  const order = await getCustomerOrder(customer.id, code);
  if (!order) notFound();

  const events = await getOrderEvents(order.id);
  const justPlaced = sp.placed === '1';

  const cancelled = order.status === 'CANCELLED';
  const reachedIndex = STATUS_FLOW.indexOf(order.status);

  return (
    <main className="flex-1">
      <Section>
        <Container>
          {justPlaced && (
            <div
              role="status"
              className="mb-6 rounded-[var(--web-card-radius)] border border-[var(--color-success)] bg-[var(--color-surface)] p-4"
            >
              <p className="font-semibold text-[var(--color-success)]">Booking confirmed</p>
              <p className="mt-1 text-[var(--web-font-size-small)] text-[var(--color-muted)]">
                We will confirm your technician shortly. Nothing has been charged — you pay cash
                after the work.
              </p>
            </div>
          )}

          <Link
            href="/orders"
            className="text-[var(--web-font-size-small)] text-[var(--color-muted)] hover:text-[var(--color-primary)]"
          >
            ← All bookings
          </Link>

          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-[var(--color-text)] md:text-4xl">
                {order.serviceName}
              </h1>
              <p className="mt-2 text-[var(--color-muted)]">
                {order.code} · booked {formatDateTime(order.createdAt)}
              </p>
            </div>
            <Badge tone={STATUS_TONE[order.status]}>{STATUS_LABEL[order.status]}</Badge>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="flex flex-col gap-6">
              <section className="rounded-[var(--web-card-radius)] border border-[var(--color-border)] p-6">
                <h2 className="font-bold text-[var(--color-text)]">Progress</h2>

                {cancelled ? (
                  <p className="mt-3 text-[var(--color-danger)]">This booking was cancelled.</p>
                ) : (
                  <ol className="mt-4 flex flex-col gap-3">
                    {STATUS_FLOW.map((status, i) => {
                      const done = i <= reachedIndex;
                      return (
                        <li key={status} className="flex items-center gap-3">
                          {done ? (
                            <Check
                              aria-hidden
                              className="h-5 w-5 shrink-0 text-[var(--color-success)]"
                            />
                          ) : (
                            <CircleDashed
                              aria-hidden
                              className="h-5 w-5 shrink-0 text-[var(--color-border)]"
                            />
                          )}
                          <span
                            className={
                              done ? 'font-medium text-[var(--color-text)]' : 'text-[var(--color-muted)]'
                            }
                          >
                            {STATUS_LABEL[status]}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </section>

              <section className="rounded-[var(--web-card-radius)] border border-[var(--color-border)] p-6">
                <h2 className="font-bold text-[var(--color-text)]">Activity</h2>
                <ol className="mt-4 flex flex-col gap-4">
                  {events.map((event, i) => (
                    <li key={i} className="flex gap-3">
                      <span
                        aria-hidden
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-primary)]"
                      />
                      <div>
                        <p className="font-medium text-[var(--color-text)]">
                          {STATUS_LABEL[event.status]}
                        </p>
                        {event.note && (
                          <p className="text-[var(--web-font-size-small)] text-[var(--color-muted)]">
                            {event.note}
                          </p>
                        )}
                        <p className="text-[var(--web-font-size-caption)] text-[var(--color-muted)]">
                          {formatDateTime(event.createdAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            </div>

            <aside className="flex flex-col gap-6">
              <section className="rounded-[var(--web-card-radius)] border border-[var(--color-border)] p-6">
                <h2 className="font-bold text-[var(--color-text)]">Appointment</h2>
                <dl className="mt-4 flex flex-col gap-3 text-[var(--web-font-size-small)]">
                  <div>
                    <dt className="text-[var(--color-muted)]">Date</dt>
                    <dd className="font-medium">{formatDate(order.scheduledDate)}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--color-muted)]">Window</dt>
                    <dd className="font-medium">{order.slotLabel}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--color-muted)]">Address</dt>
                    <dd>{order.addressSnapshot}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--color-muted)]">Contact</dt>
                    <dd>
                      {order.nameSnapshot} · {order.phoneSnapshot}
                    </dd>
                  </div>
                  {order.notes && (
                    <div>
                      <dt className="text-[var(--color-muted)]">Your notes</dt>
                      <dd>{order.notes}</dd>
                    </div>
                  )}
                </dl>
              </section>

              {order.technicianName && !cancelled && (
                <section className="rounded-[var(--web-card-radius)] border border-[var(--color-border)] p-6">
                  <h2 className="font-bold text-[var(--color-text)]">Your technician</h2>
                  <p className="mt-3 font-medium">{order.technicianName}</p>
                  {/*
                    The number appears only once they are actually on the way or
                    working. Before that there is nothing to call about, and a
                    technician's personal mobile should not be handed out earlier
                    than it is needed.
                  */}
                  {order.technicianPhone &&
                  (order.status === 'ON_THE_WAY' || order.status === 'IN_PROGRESS') ? (
                    <a
                      href={`tel:${order.technicianPhone}`}
                      className="mt-1 inline-block text-[var(--web-font-size-small)] text-[var(--color-primary)] hover:underline"
                    >
                      {order.technicianPhone}
                    </a>
                  ) : (
                    <p className="mt-1 text-[var(--web-font-size-small)] text-[var(--color-muted)]">
                      Their number appears here once they set off.
                    </p>
                  )}
                </section>
              )}

              <section className="rounded-[var(--web-card-radius)] border border-[var(--color-border)] p-6">
                <h2 className="font-bold text-[var(--color-text)]">Payment</h2>
                <dl className="mt-4 flex flex-col gap-2 text-[var(--web-font-size-small)]">
                  <div className="flex justify-between gap-4">
                    <dt className="text-[var(--color-muted)]">Service</dt>
                    <dd>{formatTaka(order.basePrice)}</dd>
                  </div>
                  {order.creditApplied > 0 && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-[var(--color-muted)]">Credit applied</dt>
                      <dd className="text-[var(--color-success)]">
                        − {formatTaka(order.creditApplied)}
                      </dd>
                    </div>
                  )}
                </dl>
                <div className="mt-4 flex items-baseline justify-between border-t border-[var(--color-border)] pt-4">
                  <span className="font-medium">Pay in cash</span>
                  <span className="text-2xl font-bold">{formatTaka(order.total)}</span>
                </div>
              </section>

              {!cancelled && order.status !== 'COMPLETED' && (
                <CancelOrder code={order.code} canCancel={order.status === 'PENDING' || order.status === 'APPROVED'} />
              )}
            </aside>
          </div>
        </Container>
      </Section>
    </main>
  );
}
