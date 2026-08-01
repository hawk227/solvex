import Link from 'next/link';
import { Container, Section } from '@/components/layout/container';
import { BlueprintAc, BlueprintFridge, BlueprintWasher } from '@/components/ui/blueprint';

/**
 * The visual break in a long run of text.
 *
 * Between "how it works" and the FAQs the page was six consecutive blocks of
 * words, which is where a reader leaves. This gives the eye somewhere to land
 * and carries real content while doing it — each panel names the appliance and
 * the fault people actually search for, and links to that category.
 *
 * Drawn artwork rather than photographs, for the reason in blueprint.tsx. The
 * panels are sized so real photography can replace the SVG in place, with no
 * layout change.
 */
const PANELS = [
  {
    art: BlueprintAc,
    slug: 'air-conditioner',
    eyebrow: 'Air conditioning',
    title: 'Cooling badly, or smelling when it starts',
    body: 'Filters and coils clog long before a unit fails outright. A clean restores cooling and stops the smell; a checkup tells you whether gas is genuinely low or just leaking.',
    tint: 'bg-[#fff1e8]',
  },
  {
    art: BlueprintFridge,
    slug: 'refrigerator',
    eyebrow: 'Refrigerators',
    title: 'Running constantly and still not cold',
    body: 'Usually the condenser coils, not the compressor. Worth checking before anyone sells you a part — the difference between the two is most of the bill.',
    tint: 'bg-[#fdf2f8]',
  },
  {
    art: BlueprintWasher,
    slug: 'washing-machine',
    eyebrow: 'Washing machines',
    title: 'Draining slowly, or spinning off balance',
    body: 'Filter and drain build-up causes both, and both get worse the longer they are left. A service clears it and tests the spin before the technician leaves.',
    tint: 'bg-[#eef2ff]',
  },
];

export function Showcase() {
  return (
    <Section className="bg-[var(--color-surface)]">
      <Container>
        <div className="flex flex-col gap-2">
          <p className="text-[var(--web-font-size-caption)] font-bold uppercase tracking-wide text-[var(--color-primary)]">
            Common faults
          </p>
          <h2 className="max-w-[24ch] text-2xl font-semibold text-[var(--color-text)] md:text-3xl">
            What people usually call us about
          </h2>
        </div>

        <div className="mt-8 flex flex-col gap-6">
          {PANELS.map((panel, i) => (
            <article
              key={panel.slug}
              className="grid overflow-hidden rounded-[var(--web-card-radius)] border border-[var(--color-border)] bg-[var(--color-card)] md:grid-cols-2"
            >
              {/*
                Alternating sides on desktop so three stacked panels do not read
                as one repeated block. `order` only, so the DOM order still puts
                the text first for a screen reader.
              */}
              <div
                className={`flex items-center justify-center p-6 md:p-8 ${panel.tint} ${
                  i % 2 === 1 ? 'md:order-2' : ''
                }`}
              >
                <panel.art className="max-h-56 text-[var(--color-primary)]" />
              </div>

              <div className="flex flex-col justify-center gap-3 p-6 md:p-9">
                <p className="text-[var(--web-font-size-caption)] font-bold uppercase tracking-wide text-[var(--color-muted)]">
                  {panel.eyebrow}
                </p>
                <h3 className="text-xl font-semibold leading-snug text-[var(--color-text)]">
                  {panel.title}
                </h3>
                <p className="text-[var(--web-font-size-small)] leading-relaxed text-[var(--color-muted)]">
                  {panel.body}
                </p>
                <Link
                  href={`/services?category=${panel.slug}`}
                  className="mt-1 inline-flex min-h-11 items-center text-[var(--web-font-size-small)] font-semibold text-[var(--color-primary)] hover:underline"
                >
                  See {panel.eyebrow.toLowerCase()} services →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </Container>
    </Section>
  );
}
