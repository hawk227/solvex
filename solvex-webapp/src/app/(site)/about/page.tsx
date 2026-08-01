import Link from 'next/link';
import { BadgeCheck, CalendarClock, Receipt, Wallet } from 'lucide-react';
import { Container, Section } from '@/components/layout/container';
import { Button } from '@/components/ui/button';
import { BlueprintAc, BlueprintFridge, BlueprintWasher } from '@/components/ui/blueprint';
import { getActiveAreas, getCapabilityCounts } from '@/lib/catalog';
import { areaSlug } from '@/lib/site-config';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'About us',
  description:
    'SolveX brings vetted appliance technicians to your door in Dhaka, with prices agreed before the work starts.',
};

/**
 * Previously seven identical heading-and-paragraph blocks in a narrow column —
 * a document rather than a page, with half the viewport empty beside it.
 *
 * Rebuilt around the one argument this business actually has: getting an
 * appliance fixed is normally opaque, and every step here is the opposite of
 * that. The argument is strongest as a direct comparison, so it gets a
 * side-by-side instead of two buried paragraphs, and each section afterwards
 * changes treatment so the eye has somewhere to go.
 *
 * Counts come from the database rather than the copy, so the page cannot claim
 * ten services the day someone adds an eleventh.
 */

const PRINCIPLES = [
  {
    icon: Receipt,
    title: 'The price is decided before we arrive',
    body: 'Set per appliance specification — a 2 ton split and a 1 ton window unit are not quoted the same. You see the figure for your exact selection before you book, and it does not move afterwards.',
  },
  {
    icon: CalendarClock,
    title: 'You choose the window, not us',
    body: 'Morning, midday or afternoon. The booking page shows only windows that still have room, so anything you can pick is genuinely available — no waiting in all day for a van that might come.',
  },
  {
    icon: BadgeCheck,
    title: 'You know who is coming',
    body: 'Every technician is identity-verified before taking a job, and recorded against the categories and areas they actually cover. Their name appears on your booking once assigned.',
  },
  {
    icon: Wallet,
    title: 'Money changes hands last',
    body: 'Nothing is charged online. You pay cash once the work is finished and you are satisfied with it — the only moment either side can honestly judge the job.',
  },
];


export default async function AboutPage() {
  const [areas, counts] = await Promise.all([getActiveAreas(), getCapabilityCounts()]);

  return (
    <main className="flex-1">
      {/* An opening statement, not a paragraph. */}
      <Section className="!pb-10">
        <Container>
          <p className="text-[var(--web-font-size-caption)] font-bold uppercase tracking-wide text-[var(--color-primary)]">
            About SolveX
          </p>
          <h1 className="mt-3 max-w-[18ch] text-4xl font-semibold leading-[1.08] tracking-tight text-[var(--color-text)] md:text-6xl">
            Appliance repair without the guesswork.
          </h1>
          <p className="mt-6 max-w-[56ch] text-lg leading-relaxed text-[var(--color-muted)]">
            {counts.services} services, {counts.technicians} identity-checked technicians and{' '}
            {counts.areas} areas of Dhaka — with the price agreed before anyone touches your
            appliance.
          </p>
        </Container>
      </Section>

      {/*
        The contrast is the argument. Side by side it lands in seconds; as two
        paragraphs it sat in the middle of a wall of text nobody finished.
      */}
      <Section className="!pt-10">
        <Container>
          <div className="grid overflow-hidden rounded-[var(--web-card-radius)] border border-[var(--color-border)] md:grid-cols-2">
            <div className="bg-[var(--color-surface)] p-7 md:p-10">
              <p className="text-[var(--web-font-size-caption)] font-bold uppercase tracking-wide text-[var(--color-muted)]">
                The usual way
              </p>
              <ul className="mt-5 flex flex-col gap-4 text-[var(--color-muted)]">
                <li>You call a number someone gave you.</li>
                <li>Someone comes at some point, or does not.</li>
                <li>The appliance is opened up.</li>
                <li>You are told the cost once the work is already done.</li>
              </ul>
            </div>

            <div className="bg-[var(--color-text)] p-7 text-white md:p-10">
              <p className="text-[var(--web-font-size-caption)] font-bold uppercase tracking-wide text-white/60">
                Booking with us
              </p>
              <ul className="mt-5 flex flex-col gap-4">
                <li>You see the price for your exact appliance.</li>
                <li>You pick a date and a three-hour window.</li>
                <li>You are told who is coming before they arrive.</li>
                <li>You pay in cash, after, once you are happy.</li>
              </ul>
            </div>
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <h2 className="max-w-[22ch] text-2xl font-semibold text-[var(--color-text)] md:text-3xl">
            Four things we decided at the start
          </h2>

          <div className="mt-8 grid gap-x-10 gap-y-8 md:grid-cols-2">
            {PRINCIPLES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-tint)]/30">
                  <Icon aria-hidden className="h-5 w-5 text-[var(--color-primary)]" />
                </span>
                <div>
                  <h3 className="font-semibold text-[var(--color-text)]">{title}</h3>
                  <p className="mt-1.5 text-[var(--web-font-size-small)] leading-relaxed text-[var(--color-muted)]">
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <Section className="bg-[var(--color-surface)]">
        <Container>
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-semibold text-[var(--color-text)] md:text-3xl">
                What we work on
              </h2>
              <p className="mt-4 max-w-[48ch] leading-relaxed text-[var(--color-muted)]">
                Air conditioners, refrigerators, washing machines, ovens, televisions, water
                purifiers and geysers — cleaning, servicing, health checks and repairs. Every
                service page lists exactly what is covered and what is not, so there is nothing
                left to negotiate at your door.
              </p>
              <Button asChild className="mt-6">
                <Link href="/services">See all {counts.services} services</Link>
              </Button>
            </div>

            {/* Drawn, not photographed — see blueprint.tsx for why. */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-[var(--radius-md)] bg-[#fff1e8] p-3">
                <BlueprintAc className="text-[var(--color-primary)]" />
              </div>
              <div className="rounded-[var(--radius-md)] bg-[#fdf2f8] p-3">
                <BlueprintFridge className="text-[var(--color-primary)]" />
              </div>
              <div className="rounded-[var(--radius-md)] bg-[#eef2ff] p-3">
                <BlueprintWasher className="text-[var(--color-primary)]" />
              </div>
            </div>
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <h2 className="text-2xl font-semibold text-[var(--color-text)] md:text-3xl">
            Where we work
          </h2>
          <p className="mt-3 max-w-[56ch] text-[var(--color-muted)]">
            {counts.areas} areas across Dhaka, at the same prices and the same windows in each. The
            list grows as technicians come on.
          </p>

          <ul className="mt-6 flex flex-wrap gap-2">
            {areas.map((area) => (
              <li key={area.id}>
                <Link
                  href={`/areas/${areaSlug(area.name)}`}
                  className="inline-flex min-h-11 items-center rounded-[var(--radius-pill)] border border-[var(--color-border)] px-4 text-[var(--web-font-size-small)] text-[var(--color-text)] transition-colors duration-[var(--duration-hover)] hover:border-[var(--color-primary)]"
                >
                  {area.name}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/services">Book a service</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/contact">Ask us something</Link>
            </Button>
          </div>
        </Container>
      </Section>
    </main>
  );
}
