import Link from 'next/link';
import { AirVent, Refrigerator, Microwave, WashingMachine, Wrench } from 'lucide-react';
import { Container } from '@/components/layout/container';

export type RailCategory = {
  id: number;
  slug: string;
  name: string;
  imageUrl: string | null;
  serviceCount: number;
};

/**
 * Icon fallback when a category has no uploaded image yet. Matched on slug so
 * the site looks finished before any image is uploaded in the CMS.
 */
const ICONS: Record<string, typeof Wrench> = {
  'air-conditioner': AirVent,
  ac: AirVent,
  refrigerator: Refrigerator,
  fridge: Refrigerator,
  oven: Microwave,
  microwave: Microwave,
  'washing-machine': WashingMachine,
  washer: WashingMachine,
};

/**
 * Horizontally scrolling card that overlaps the hero, as on the reference site.
 * Overflow is contained here so the page body never scrolls sideways.
 */
export function CategoryRail({ categories }: { categories: RailCategory[] }) {
  if (categories.length === 0) return null;

  return (
    <Container>
      <div className="-mt-8 rounded-[var(--web-card-radius)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-md)] md:-mt-10 md:p-6">
        <ul className="rail flex gap-2 overflow-x-auto md:justify-center">
          {categories.map((category) => {
            const Icon = ICONS[category.slug] ?? Wrench;
            return (
              <li key={category.id} className="shrink-0">
                <Link
                  href={`/services?category=${category.slug}`}
                  className="flex w-28 flex-col items-center gap-2 rounded-[var(--radius-md)] p-3 text-center transition-colors duration-[var(--duration-hover)] hover:bg-[var(--color-surface)] md:w-32"
                >
                  {category.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={category.imageUrl}
                      alt=""
                      loading="lazy"
                      className="h-12 w-12 rounded-[var(--radius-md)] object-cover"
                    />
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-tint)]/30">
                      <Icon aria-hidden className="h-6 w-6 text-[var(--color-primary)]" />
                    </span>
                  )}
                  <span className="text-[var(--web-font-size-small)] font-medium leading-snug text-[var(--color-text)]">
                    {category.name}
                  </span>
                  <span className="text-[var(--web-font-size-caption)] text-[var(--color-muted)]">
                    {category.serviceCount}{' '}
                    {category.serviceCount === 1 ? 'service' : 'services'}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </Container>
  );
}
