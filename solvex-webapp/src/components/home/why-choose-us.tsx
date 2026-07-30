import { BadgeCheck, HandCoins, ShieldCheck, Tags } from 'lucide-react';
import { Container, Section, SectionHeading } from '@/components/layout/container';

/**
 * Trust section, in the shape the reference site uses.
 *
 * Note: the reference pairs this with a counters strip ("2,00,000+ orders
 * served"). SolveX has no order history yet, so no counters appear here —
 * inventing them would be a false claim to customers. Add a data-driven strip
 * once the numbers are real.
 */
const POINTS = [
  {
    icon: ShieldCheck,
    title: 'Vetted technicians',
    body: 'Every technician is identity-checked before they take a job.',
  },
  {
    icon: Tags,
    title: 'Prices you see upfront',
    body: 'The price for your exact appliance is shown before you book. No surprise add-ons.',
  },
  {
    icon: HandCoins,
    title: 'Pay after the work',
    body: 'Cash on completion. Nothing is charged when you place the order.',
  },
  {
    icon: BadgeCheck,
    title: 'Told what is included',
    body: "Each service lists what's covered and what isn't, so there's no argument at your door.",
  },
] as const;

export function WhyChooseUs() {
  return (
    <Section>
      <Container>
        <SectionHeading eyebrow="Why SolveX" title="Straightforward home servicing" />

        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {POINTS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex flex-col gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-tint)]/30">
                <Icon aria-hidden className="h-5 w-5 text-[var(--color-primary)]" />
              </span>
              <h3 className="font-semibold text-[var(--color-text)]">{title}</h3>
              <p className="text-[var(--web-font-size-small)] text-[var(--color-muted)]">{body}</p>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
