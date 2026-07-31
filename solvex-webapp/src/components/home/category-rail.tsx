import Link from 'next/link';
import {
  AirVent,
  Refrigerator,
  Microwave,
  WashingMachine,
  Tv,
  Droplet,
  Flame,
  Fan,
  CookingPot,
  Wrench,
} from 'lucide-react';
import { Container } from '@/components/layout/container';
import { formatTaka } from '@/lib/format';

export type RailCategory = {
  id: number;
  slug: string;
  name: string;
  imageUrl: string | null;
  serviceCount: number;
  /** Cheapest bookable price in this category, or null if nothing is priced. */
  fromPrice: number | null;
};

const ICONS: Record<string, typeof Wrench> = {
  'air-conditioner': AirVent,
  ac: AirVent,
  refrigerator: Refrigerator,
  fridge: Refrigerator,
  oven: Microwave,
  microwave: Microwave,
  'washing-machine': WashingMachine,
  washer: WashingMachine,
  television: Tv,
  tv: Tv,
  'water-purifier': Droplet,
  geyser: Flame,
  'water-heater': Flame,
  'air-cooler': Fan,
  'kitchen-hood': CookingPot,
  dishwasher: CookingPot,
};

/**
 * The rate strip: what we fix, and what it starts at.
 *
 * It leads with price rather than a service count on purpose. "3 services" is a
 * fact about our catalogue and does nothing for the person reading it; "from
 * ৳800" is what they came to find out. In a market where every competitor makes
 * you phone up for a quote, publishing the price on the homepage is the actual
 * differentiator — the hero already promises fixed prices, and this is where it
 * proves it rather than claiming it.
 *
 * Two layout bugs fixed here, both visible on the deployed site:
 *
 *  - `relative z-10` is load-bearing. The hero is a positioned element, so it
 *    painted OVER this card and swallowed the icon row — the overlap looked
 *    like icons colliding with the panel edge. A negative margin alone could
 *    never fix that; the card needs to win the stacking order. The hero also
 *    now reserves the overlap as bottom padding instead of being cut into.
 *  - The price never wraps. "from ৳1,400" broke onto two lines in a 104px
 *    card and pushed that one tile's baseline out of line with the rest.
 *  - Name and price now sit in fixed-height rows. Category names wrap to one or
 *    two lines ("Refrigerator" against "Air Conditioner"), which left the prices
 *    at different heights across the row and read as broken alignment.
 */
export function CategoryRail({ categories }: { categories: RailCategory[] }) {
  if (categories.length === 0) return null;

  return (
    <Container>
      <div className="relative z-10 -mt-14 rounded-[var(--web-card-radius)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-md)] md:-mt-16">
        <ul className="rail flex gap-1 overflow-x-auto p-3 md:justify-center md:p-4">
          {categories.map((category) => {
            const Icon = ICONS[category.slug] ?? Wrench;
            return (
              <li key={category.id} className="shrink-0">
                <Link
                  href={`/services?category=${category.slug}`}
                  className="group flex w-[116px] flex-col items-center rounded-[var(--radius-md)] px-2 py-3 text-center transition-colors duration-[var(--duration-hover)] hover:bg-[var(--color-surface)] md:w-[124px]"
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
                    <span className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-tint)]/30 transition-colors duration-[var(--duration-hover)] group-hover:bg-[var(--color-primary-tint)]/60">
                      <Icon aria-hidden className="h-6 w-6 text-[var(--color-primary)]" />
                    </span>
                  )}

                  {/* Two lines reserved, so every price below sits on one line. */}
                  <span className="mt-2.5 flex h-9 items-center text-[var(--web-font-size-small)] font-medium leading-[1.15] text-[var(--color-text)]">
                    {category.name}
                  </span>

                  {category.fromPrice === null ? (
                    // Never invent a price. A category with nothing priced says
                    // what it has instead.
                    <span className="whitespace-nowrap text-[var(--web-font-size-caption)] text-[var(--color-muted)]">
                      {category.serviceCount}{' '}
                      {category.serviceCount === 1 ? 'service' : 'services'}
                    </span>
                  ) : (
                    <span className="whitespace-nowrap text-[var(--web-font-size-caption)] font-semibold text-[var(--color-primary)]">
                      from {formatTaka(category.fromPrice)}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </Container>
  );
}
