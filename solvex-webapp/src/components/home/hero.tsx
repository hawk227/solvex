import { Container } from '@/components/layout/container';
import { HeroSearch } from './hero-search';
import { getStrings } from '@/lib/locale';

/**
 * Hero modelled on the reference site: full-bleed tinted panel, one h1, and an
 * area picker fused to a service search as the primary action.
 *
 * The background is a CSS gradient rather than a photograph — there is no
 * licensed hero image yet, and a stock photo of someone else's technicians
 * would misrepresent the service. Swap in a real photo when one exists; the
 * overlay already guarantees text contrast over it.
 *
 * The bottom padding is load-bearing: the category rate strip overlaps up into
 * it, and the hero has to reserve that space rather than let the strip sit on
 * top of content.
 */
export async function Hero({ areas }: { areas: { id: number; name: string }[] }) {
  const { s } = await getStrings();

  return (
    <div className="relative isolate overflow-hidden bg-[var(--color-text)]">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-br from-[var(--color-text)] via-[var(--color-text)] to-[var(--color-primary)] opacity-95"
      />

      <Container>
        {/*
          Bottom padding reserves the strip's overlap (-mt-14 / -mt-16 plus
          breathing room). Without it the panel edge cut through the icons.
        */}
        <div className="pb-28 pt-16 text-center md:pb-32 md:pt-24">
          <h1 className="mx-auto max-w-[24ch] text-3xl font-semibold leading-tight text-white sm:text-4xl md:text-5xl lg:text-[56px]">
            {s.hero.title}
          </h1>
          <p className="mx-auto mt-4 max-w-[52ch] text-white/85 md:text-lg">
            {s.hero.subtitle}
          </p>

          <div className="mt-8">
            <HeroSearch
              areas={areas}
              strings={{
                area: s.hero.area,
                allAreas: s.hero.allAreas,
                searchPlaceholder: s.hero.searchPlaceholder,
                search: s.hero.search,
              }}
            />
          </div>
        </div>
      </Container>
    </div>
  );
}
