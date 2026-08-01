import Link from 'next/link';
import { Mail, MapPin, Phone } from 'lucide-react';
import { Container, Section } from '@/components/layout/container';

export const metadata = {
  title: 'Contact us',
  description: 'Get in touch with SolveX about a booking, a quote, or a service you cannot find.',
};

/*
 * Contact details are placeholders. Real phone, email and address must be
 * supplied before launch — publishing invented contact details would send
 * customers nowhere.
 */
const ROUTES = [
  {
    title: 'About a booking you already have',
    body: 'Open a support ticket from your account. It arrives attached to the booking, so whoever picks it up can already see the service, the date and the technician.',
    href: '/support/new',
    cta: 'Open a ticket',
  },
  {
    title: 'Not sure which service you need',
    body: 'Every service page lists what is covered and what is not. If the symptom does not obviously match one, tell us the appliance and what it is doing.',
    href: '/services',
    cta: 'Browse services',
  },
  {
    title: 'Something we do not list yet',
    body: 'An appliance we do not cover, or an area outside the list. Both are worth telling us — it is how we decide what to add next.',
    href: '/services',
    cta: 'See what we cover',
  },
] as const;

const DETAILS = [
  { icon: Phone, label: 'Phone', value: '+880 0000 000000', href: 'tel:+8800000000000' },
  { icon: Mail, label: 'Email', value: 'hello@solvex.example', href: 'mailto:hello@solvex.example' },
  { icon: MapPin, label: 'Office', value: 'Dhaka, Bangladesh', href: null },
] as const;

export default function ContactPage() {
  return (
    <main className="flex-1">
      <Section>
        <Container>
          <h1 className="text-3xl font-semibold leading-tight text-[var(--color-text)] md:text-4xl">
            Contact us
          </h1>
          <p className="mt-3 max-w-[var(--web-measure)] text-lg text-[var(--color-muted)]">
            Questions about a booking, or need a quote for something not listed? Reach us directly.
          </p>

          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {DETAILS.map(({ icon: Icon, label, value, href }) => (
              <li
                key={label}
                className="rounded-[var(--web-card-radius)] border border-[var(--color-border)] bg-[var(--color-card)] p-6"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-tint)]/30">
                  <Icon aria-hidden className="h-5 w-5 text-[var(--color-primary)]" />
                </span>
                <h2 className="mt-4 text-[var(--web-font-size-small)] font-bold uppercase tracking-wide text-[var(--color-muted)]">
                  {label}
                </h2>
                {href ? (
                  <a
                    href={href}
                    className="mt-1 block font-medium text-[var(--color-text)] hover:text-[var(--color-primary)]"
                  >
                    {value}
                  </a>
                ) : (
                  <p className="mt-1 font-medium text-[var(--color-text)]">{value}</p>
                )}
              </li>
            ))}
          </ul>

          {/*
            Routing before contact details. Most people arriving here have an
            existing booking, and a ticket attached to that booking reaches
            someone with the order in front of them — which a generic email
            does not. Sending everyone to one inbox is how a support queue
            becomes unanswerable.
          */}
          <section className="mt-12" aria-labelledby="reach-us">
            <h2 id="reach-us" className="text-xl font-bold text-[var(--color-text)]">
              The fastest way to reach us
            </h2>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {ROUTES.map((route) => (
                <div
                  key={route.title}
                  className="flex flex-col rounded-[var(--web-card-radius)] border border-[var(--color-border)] bg-[var(--color-card)] p-5"
                >
                  <h3 className="font-semibold text-[var(--color-text)]">{route.title}</h3>
                  <p className="mt-1.5 flex-1 text-[var(--web-font-size-small)] leading-relaxed text-[var(--color-muted)]">
                    {route.body}
                  </p>
                  <Link
                    href={route.href}
                    className="mt-4 inline-flex min-h-11 items-center text-[var(--web-font-size-small)] font-semibold text-[var(--color-primary)] hover:underline"
                  >
                    {route.cta} →
                  </Link>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <div className="rounded-[var(--web-card-radius)] bg-[var(--color-surface)] p-6">
              <h2 className="font-bold text-[var(--color-text)]">Service hours</h2>
              <p className="mt-2 text-[var(--color-muted)]">
                Bookings run in three windows daily, Asia/Dhaka time:
              </p>
              <ul className="mt-3 flex flex-col gap-1.5 text-[var(--web-font-size-small)] text-[var(--color-text)]">
                <li>9:00 AM – 12:00 PM</li>
                <li>12:00 PM – 3:00 PM</li>
                <li>3:00 PM – 6:00 PM</li>
              </ul>
              <p className="mt-3 text-[var(--web-font-size-small)] text-[var(--color-muted)]">
                The booking page shows only windows that still have room, so anything you can
                select is genuinely available.
              </p>
            </div>

            <div className="rounded-[var(--web-card-radius)] bg-[var(--color-surface)] p-6">
              <h2 className="font-bold text-[var(--color-text)]">Where we cover</h2>
              <p className="mt-2 text-[var(--color-muted)]">
                Selected areas across Dhaka, with the same prices and the same windows in each.
              </p>
              <p className="mt-3 text-[var(--web-font-size-small)] text-[var(--color-muted)]">
                Not in the list? Tell us where you are — we add areas as technicians come on, and
                knowing where demand is decides which one is next.
              </p>
              <Link
                href="/services"
                className="mt-3 inline-flex min-h-11 items-center text-[var(--web-font-size-small)] font-semibold text-[var(--color-primary)] hover:underline"
              >
                Check your area at booking →
              </Link>
            </div>
          </div>
        </Container>
      </Section>
    </main>
  );
}
