import Link from 'next/link';
import { Clock } from 'lucide-react';
import { formatDuration, formatTaka } from '@/lib/format';
import { ApplianceVisual } from '@/components/ui/appliance-visual';

export type ServiceCardData = {
  id: number;
  slug: string;
  name: string;
  shortDesc: string | null;
  categoryName: string;
  categorySlug: string;
  imageUrl: string | null;
  durationMin: number | null;
  /** Lowest configured price, or null when the service is not yet priced. */
  fromPrice: number | null;
};

export function ServiceCard({
  service,
  /**
   * Where the card goes. Defaults to the public service page, which is what a
   * visitor still deciding needs. The signed-in booking catalogue overrides it
   * to go straight to the form — someone who clicked "Book a service" has
   * already decided, and a marketing page in between is a step backwards.
   */
  href,
}: {
  service: ServiceCardData;
  href?: string;
}) {
  return (
    <article className="group h-full overflow-hidden rounded-[var(--web-card-radius)] border border-[var(--color-border)] bg-[var(--color-card)] transition-shadow duration-[var(--duration-default)] hover:shadow-[var(--shadow-md)]">
      <Link href={href ?? `/services/${service.slug}`} className="flex h-full flex-col">
        <div className="flex aspect-[16/10] items-center justify-center overflow-hidden bg-[var(--color-surface)]">
          {service.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={service.imageUrl}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-[var(--duration-default)] group-hover:scale-105"
            />
          ) : (
            <ApplianceVisual slug={service.categorySlug} className="h-full w-full" />
          )}
        </div>

        <div className="flex flex-1 flex-col p-4">
          <p className="text-[var(--web-font-size-caption)] font-medium uppercase tracking-wide text-[var(--color-primary)]">
            {service.categoryName}
          </p>
          <h3 className="mt-1 font-semibold leading-snug text-[var(--color-text)]">
            {service.name}
          </h3>
          {service.shortDesc && (
            <p className="mt-1 line-clamp-2 text-[var(--web-font-size-small)] text-[var(--color-muted)]">
              {service.shortDesc}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-1">
            {service.fromPrice !== null ? (
              <p className="font-bold text-[var(--color-text)]">
                <span className="text-[var(--web-font-size-caption)] font-normal text-[var(--color-muted)]">
                  from{' '}
                </span>
                {formatTaka(service.fromPrice)}
              </p>
            ) : (
              <p className="text-[var(--web-font-size-small)] text-[var(--color-muted)]">
                Price on request
              </p>
            )}

            {service.durationMin && (
              <span className="flex items-center gap-1 text-[var(--web-font-size-caption)] text-[var(--color-muted)]">
                <Clock aria-hidden className="h-3.5 w-3.5" />
                {formatDuration(service.durationMin)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}
