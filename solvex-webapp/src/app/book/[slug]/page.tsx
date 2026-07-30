import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getAvailability, getCreditBalance } from '@solvex/db';
import { Container, Section } from '@/components/layout/container';
import { db } from '@/lib/cf';
import { getServiceBySlug, getServicePrices, getServiceVariables } from '@/lib/catalog';
import { requireCustomer, getProfile } from '@/lib/session';
import { BookingForm } from './booking-form';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps<'/book/[slug]'>) {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  return { title: service ? `Book ${service.name}` : 'Book a service' };
}

/**
 * Next 14 bookable dates.
 *
 * Dates are resolved in Asia/Dhaka, not in the server's timezone — a Worker in
 * another region would otherwise offer "today" a day out for a Dhaka customer.
 */
function upcomingDates(): { value: string; weekday: string; day: string; month: string }[] {
  const now = Date.now();
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now + i * 86_400_000);
    const tz = { timeZone: 'Asia/Dhaka' } as const;
    return {
      // en-CA formats as YYYY-MM-DD, matching how dates are stored.
      value: d.toLocaleDateString('en-CA', tz),
      weekday: d.toLocaleDateString('en-GB', { ...tz, weekday: 'short' }),
      day: d.toLocaleDateString('en-GB', { ...tz, day: '2-digit' }),
      month: d.toLocaleDateString('en-GB', { ...tz, month: 'short' }),
    };
  });
}

export default async function BookPage({ params, searchParams }: PageProps<'/book/[slug]'>) {
  const { slug } = await params;
  const customer = await requireCustomer(`/book/${slug}`);

  const service = await getServiceBySlug(slug);
  if (!service) notFound();

  // Booking needs a delivery address, so an incomplete profile is sent to finish
  // it first and returned here afterwards.
  const profile = await getProfile(customer.id);
  if (!profile) redirect(`/profile/complete?next=${encodeURIComponent(`/book/${slug}`)}`);

  const sp = await searchParams;
  const comboFromUrl = Array.isArray(sp.combo) ? sp.combo[0] : sp.combo;

  const dates = upcomingDates();
  const firstDate = dates[0]!.value;

  const [groups, prices, availability, creditBalance] = await Promise.all([
    getServiceVariables(service.id),
    getServicePrices(service.id),
    getAvailability(db(), firstDate),
    getCreditBalance(db(), customer.id),
  ]);

  return (
    <main className="flex-1">
      <Section>
        <Container>
          <Link
            href={`/services/${service.slug}`}
            className="text-[var(--web-font-size-small)] text-[var(--color-muted)] hover:text-[var(--color-primary)]"
          >
            ← Back to {service.name}
          </Link>

          <h1 className="mt-3 text-3xl font-semibold text-[var(--color-text)] md:text-4xl">
            Book {service.name}
          </h1>
          <p className="mt-2 text-[var(--color-muted)]">
            Pick a time. You pay the technician in cash after the work is done.
          </p>

          <div className="mt-8">
            <BookingForm
              serviceId={service.id}
              groups={groups}
              prices={prices}
              initialComboKey={comboFromUrl ?? null}
              dates={dates}
              initialAvailability={availability}
              creditBalance={creditBalance}
              profile={{
                fullName: profile.fullName,
                phone: profile.phone,
                address: profile.address,
              }}
            />
          </div>
        </Container>
      </Section>
    </main>
  );
}
