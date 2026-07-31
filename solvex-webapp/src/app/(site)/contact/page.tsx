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

          <div className="mt-10 rounded-[var(--web-card-radius)] bg-[var(--color-surface)] p-6">
            <h2 className="font-bold text-[var(--color-text)]">Service hours</h2>
            <p className="mt-2 text-[var(--color-muted)]">
              Bookings run in three windows daily: 9:00 AM – 12:00 PM, 12:00 PM – 3:00 PM, and
              3:00 PM – 6:00 PM, Asia/Dhaka.
            </p>
          </div>
        </Container>
      </Section>
    </main>
  );
}
