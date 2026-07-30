import { Container } from '@/components/layout/container';
import { HeroSearch } from './hero-search';

/**
 * Hero modelled on the reference site: full-bleed tinted panel, one h1, and an
 * area picker fused to a service search as the primary action.
 *
 * The background is a CSS gradient rather than a photograph — there is no
 * licensed hero image yet, and a stock photo of someone else's technicians
 * would misrepresent the service. Swap in a real photo when one exists; the
 * overlay already guarantees text contrast over it.
 */
export function Hero({ areas }: { areas: { id: number; name: string }[] }) {
  return (
    <div className="relative isolate overflow-hidden bg-[var(--color-text)]">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-br from-[var(--color-text)] via-[var(--color-text)] to-[var(--color-primary)] opacity-95"
      />

      <Container>
        <div className="py-16 text-center md:py-24">
          <h1 className="mx-auto max-w-[24ch] text-3xl font-semibold leading-tight text-white sm:text-4xl md:text-5xl lg:text-[56px]">
            Appliance experts at your door
          </h1>
          <p className="mx-auto mt-4 max-w-[52ch] text-white/85 md:text-lg">
            AC, fridge, oven and washing machine servicing across Dhaka. Fixed prices, vetted
            technicians, pay cash after the job.
          </p>

          <div className="mt-8">
            <HeroSearch areas={areas} />
          </div>
        </div>
      </Container>
    </div>
  );
}
