import Link from 'next/link';
import { ArrowRight, CalendarDays, Clock, LifeBuoy, MapPin, Plus, Wallet } from 'lucide-react';
import { Container, Section } from '@/components/layout/container';
import { AccountNav } from '@/components/layout/account-nav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getDashboard } from '@/lib/dashboard';
import { STATUS_LABEL, STATUS_TONE } from '@/lib/orders';
import { getProfile, requireCustomer } from '@/lib/session';
import { formatDate, formatTaka } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your dashboard' };

const CARD =
  'rounded-[var(--web-card-radius)] border border-[var(--color-border)] bg-[var(--color-card)]';

export default async function DashboardPage() {
  const customer = await requireCustomer('/dashboard');
  const [profile, data] = await Promise.all([getProfile(customer.id), getDashboard(customer.id)]);

  const firstName = (profile?.fullName ?? customer.name).split(' ')[0];

  return (
    <main className="flex-1">
      <AccountNav />

      <Section>
        <Container>
          <h1 className="text-2xl font-semibold text-[var(--color-text)] md:text-3xl">
            Hello, {firstName}
          </h1>

          {/*
            Profile completion blocks booking entirely, so it outranks
            everything else on the page when it is missing.
          */}
          {!profile && (
            <div className="mt-6 rounded-[var(--web-card-radius)] border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 p-5">
              <p className="font-medium text-[var(--color-text)]">
                Add your address before you book
              </p>
              <p className="mt-1 text-[var(--web-font-size-small)] text-[var(--color-muted)]">
                We need a name, mobile number and address to send a technician.
              </p>
              <Button asChild className="mt-4">
                <Link href="/profile/complete">Complete profile</Link>
              </Button>
            </div>
          )}

          {/*
            The next visit is the hero. "When is someone coming to my house" is
            the question this page exists to answer, and everything below it is
            secondary — which is why the old account page, opening with the
            customer's own address, read as beside the point.
          */}
          <section className="mt-6" aria-labelledby="next-visit">
            <h2 id="next-visit" className="sr-only">
              Your next visit
            </h2>

            {data.nextVisit ? (
              <div className="overflow-hidden rounded-[var(--web-card-radius)] border border-[var(--color-border)] bg-[var(--color-text)] text-white">
                <div className="p-6 md:p-7">
                  <p className="text-[var(--web-font-size-caption)] uppercase tracking-wide text-white/60">
                    Next visit
                  </p>

                  <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xl font-semibold md:text-2xl">
                        {data.nextVisit.serviceName}
                      </p>
                      <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-white/85">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays aria-hidden className="h-4 w-4" />
                          {formatDate(data.nextVisit.scheduledDate)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock aria-hidden className="h-4 w-4" />
                          {data.nextVisit.slotLabel}
                        </span>
                      </p>
                      {data.nextVisit.technicianName && (
                        <p className="mt-2 inline-flex items-center gap-1.5 text-white/85">
                          <MapPin aria-hidden className="h-4 w-4" />
                          {data.nextVisit.technicianName} is assigned
                        </p>
                      )}
                    </div>

                    <span className="rounded-[var(--radius-pill)] bg-white/15 px-3 py-1 text-[var(--web-font-size-small)] font-medium">
                      {STATUS_LABEL[data.nextVisit.status]}
                    </span>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    {/*
                      Explicit colours rather than the shared variants: those
                      assume a light background, and on this dark card the
                      secondary button rendered white text on a near-white fill.
                    */}
                    <Button
                      asChild
                      className="bg-white text-[var(--color-text)] hover:bg-white/90"
                    >
                      <Link href={`/orders/${data.nextVisit.code}`}>View booking</Link>
                    </Button>
                    <Button
                      asChild
                      variant="ghost"
                      className="text-white hover:bg-white/10"
                    >
                      <Link href="/support/new">Need to change it?</Link>
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className={`${CARD} p-8 text-center`}>
                <p className="font-medium text-[var(--color-text)]">Nothing booked right now</p>
                <p className="mx-auto mt-1 max-w-[44ch] text-[var(--web-font-size-small)] text-[var(--color-muted)]">
                  Pick a service and a time that suits you. You pay cash once the work is done.
                </p>
                <Button asChild className="mt-5">
                  <Link href="/services">
                    <Plus className="h-4 w-4" />
                    Book a service
                  </Link>
                </Button>
              </div>
            )}
          </section>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className={`${CARD} p-5`}>
              <p className="inline-flex items-center gap-2 text-[var(--web-font-size-caption)] uppercase tracking-wide text-[var(--color-muted)]">
                <Wallet aria-hidden className="h-4 w-4" />
                Credit
              </p>
              <p className="mt-2 text-2xl font-bold text-[var(--color-text)]">
                {formatTaka(data.creditBalance)}
              </p>
              <p className="mt-1 text-[var(--web-font-size-caption)] text-[var(--color-muted)]">
                {data.creditBalance > 0 ? 'Applied at checkout' : 'Refer a friend to earn'}
              </p>
            </div>

            <div className={`${CARD} p-5`}>
              <p className="text-[var(--web-font-size-caption)] uppercase tracking-wide text-[var(--color-muted)]">
                Bookings
              </p>
              <p className="mt-2 text-2xl font-bold text-[var(--color-text)]">
                {data.totalBookings}
              </p>
              <p className="mt-1 text-[var(--web-font-size-caption)] text-[var(--color-muted)]">
                {data.completedBookings} completed
              </p>
            </div>

            <div className={`${CARD} p-5`}>
              <p className="inline-flex items-center gap-2 text-[var(--web-font-size-caption)] uppercase tracking-wide text-[var(--color-muted)]">
                <LifeBuoy aria-hidden className="h-4 w-4" />
                Support
              </p>
              <p className="mt-2 text-2xl font-bold text-[var(--color-text)]">
                {data.openTickets.length}
              </p>
              <p className="mt-1 text-[var(--web-font-size-caption)] text-[var(--color-muted)]">
                {data.openTickets.length === 1 ? 'open conversation' : 'open conversations'}
              </p>
            </div>
          </div>

          {data.openTickets.length > 0 && (
            <section className="mt-6" aria-labelledby="open-tickets">
              <h2
                id="open-tickets"
                className="text-[var(--web-font-size-small)] font-semibold uppercase tracking-wide text-[var(--color-muted)]"
              >
                Waiting on us
              </h2>
              <ul className="mt-3 flex flex-col gap-2">
                {data.openTickets.map((ticket) => (
                  <li key={ticket.ref}>
                    <Link
                      href={`/support/${ticket.ref}`}
                      className={`${CARD} flex items-center justify-between gap-3 p-4 transition-shadow duration-[var(--duration-default)] hover:shadow-[var(--shadow-md)]`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-[var(--color-text)]">
                          {ticket.subject}
                        </span>
                        <span className="text-[var(--web-font-size-caption)] text-[var(--color-muted)]">
                          {ticket.ref}
                        </span>
                      </span>
                      <ArrowRight
                        aria-hidden
                        className="h-4 w-4 shrink-0 text-[var(--color-muted)]"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {data.recent.length > 0 && (
            <section className="mt-8" aria-labelledby="recent">
              <div className="flex items-center justify-between gap-4">
                <h2
                  id="recent"
                  className="text-[var(--web-font-size-small)] font-semibold uppercase tracking-wide text-[var(--color-muted)]"
                >
                  Recent bookings
                </h2>
                <Link
                  href="/orders"
                  className="text-[var(--web-font-size-small)] text-[var(--color-primary)] hover:underline"
                >
                  See all
                </Link>
              </div>

              <ul className="mt-3 flex flex-col gap-2">
                {data.recent.map((order) => (
                  <li key={order.id}>
                    <Link
                      href={`/orders/${order.code}`}
                      className={`${CARD} flex flex-wrap items-center justify-between gap-3 p-4 transition-shadow duration-[var(--duration-default)] hover:shadow-[var(--shadow-md)]`}
                    >
                      <span>
                        <span className="block font-medium text-[var(--color-text)]">
                          {order.serviceName}
                        </span>
                        <span className="text-[var(--web-font-size-caption)] text-[var(--color-muted)]">
                          {formatDate(order.scheduledDate)} · {order.code}
                        </span>
                      </span>
                      <span className="flex items-center gap-3">
                        <Badge tone={STATUS_TONE[order.status]}>
                          {STATUS_LABEL[order.status]}
                        </Badge>
                        <span className="font-semibold text-[var(--color-text)]">
                          {formatTaka(order.total)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </Container>
      </Section>
    </main>
  );
}
