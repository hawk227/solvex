import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { Container, Section } from '@/components/layout/container';
import { areaSlug } from '@/lib/site-config';
import { getStrings, localePath } from '@/lib/locale';
import { t } from '@/lib/i18n';

/**
 * The neighbourhoods, linked to their own pages.
 *
 * Two jobs. For a visitor it answers "do you even come to my area", which is
 * the question that decides whether the rest of the page matters. For search it
 * is the only internal path to the eight area pages — without it they were
 * orphans, reachable from the sitemap alone, which is a weak signal and no help
 * at all to a person.
 */
export async function AreasCovered({ areas }: { areas: { id: number; name: string }[] }) {
  if (areas.length === 0) return null;
  const { locale, s } = await getStrings();

  return (
    <Section className="bg-[var(--color-surface)]">
      <Container>
        <div className="flex flex-col gap-2">
          <p className="text-[var(--web-font-size-caption)] font-bold uppercase tracking-wide text-[var(--color-primary)]">
            {s.home.areasEyebrow}
          </p>
          <h2 className="text-2xl font-semibold text-[var(--color-text)] md:text-3xl">
            {t(s.home.areasTitle, { count: areas.length })}
          </h2>
          <p className="max-w-[60ch] text-[var(--color-muted)]">
            {s.home.areasBody}
          </p>
        </div>

        <ul className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {areas.map((area) => (
            <li key={area.id}>
              <Link
                href={localePath(locale, `/areas/${areaSlug(area.name)}`)}
                className="flex min-h-14 items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 transition-colors duration-[var(--duration-hover)] hover:border-[var(--color-primary)]"
              >
                <MapPin aria-hidden className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                <span className="font-medium text-[var(--color-text)]">{area.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
