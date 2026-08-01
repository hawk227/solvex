import { Container, Section } from '@/components/layout/container';

/**
 * The numbers band.
 *
 * Deliberately CAPABILITY figures — what is on offer — rather than vanity
 * metrics like orders served or five-star reviews. Two reasons, and the second
 * is the one that matters commercially.
 *
 * First, this business is new; the honest order count is small, and a small
 * number shown proudly is worse than no number. Second, invented figures are a
 * false representation under Bangladesh's Consumer Rights Protection Act, and
 * a manual penalty from Google if they ever reach review markup.
 *
 * Every value here is read from the database at request time, so the band
 * cannot drift out of date the way a hardcoded "10+ services" would the moment
 * someone adds an eleventh.
 */
export function CapabilityStats({
  services,
  areas,
  technicians,
}: {
  services: number;
  areas: number;
  technicians: number;
}) {
  const STATS = [
    { value: String(services), label: 'services you can book' },
    { value: String(areas), label: 'areas across Dhaka' },
    { value: String(technicians), label: 'identity-checked technicians' },
    // The strongest number on the page, and the one competitors cannot match
    // without changing how they charge.
    { value: '৳0', label: 'paid before the work is done' },
  ];

  return (
    <Section className="!py-0">
      <Container>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--web-card-radius)] border border-[var(--color-border)] bg-[var(--color-border)] lg:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="bg-[var(--color-card)] px-5 py-7 text-center">
              <dt className="sr-only">{stat.label}</dt>
              <dd>
                <span className="block text-3xl font-bold tracking-tight text-[var(--color-text)] md:text-4xl">
                  {stat.value}
                </span>
                <span className="mt-1.5 block text-[var(--web-font-size-small)] text-[var(--color-muted)]">
                  {stat.label}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </Section>
  );
}
