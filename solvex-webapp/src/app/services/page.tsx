import Link from 'next/link';
import { Container, Section } from '@/components/layout/container';
import { ServiceCard } from '@/components/ui/service-card';
import { getRailCategories, getServices } from '@/lib/catalog';
import { cn } from '@/lib/cn';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'All services',
  description:
    'Browse every SolveX service: AC, refrigerator, oven and washing machine servicing across Dhaka.',
};

export default async function ServicesPage({ searchParams }: PageProps<'/services'>) {
  // Next 16: searchParams is a Promise.
  const params = await searchParams;

  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  const categorySlug = first(params.category);
  const query = first(params.q);

  const [categories, services] = await Promise.all([
    getRailCategories(),
    getServices({ categorySlug, query }),
  ]);

  const activeCategory = categories.find((c) => c.slug === categorySlug);

  return (
    <main className="flex-1">
      <Section className="!pb-0">
        <Container>
          <h1 className="text-3xl font-semibold text-[var(--color-text)] md:text-4xl">
            {activeCategory ? activeCategory.name : 'All services'}
          </h1>
          <p className="mt-2 text-[var(--color-muted)]">
            {query ? (
              <>
                {services.length} {services.length === 1 ? 'result' : 'results'} for{' '}
                <span className="font-medium text-[var(--color-text)]">“{query}”</span>
              </>
            ) : (
              <>
                {services.length} {services.length === 1 ? 'service' : 'services'} available
              </>
            )}
          </p>

          <nav aria-label="Filter by category" className="mt-6">
            <ul className="rail flex gap-2 overflow-x-auto pb-1">
              <li className="shrink-0">
                <Link
                  href="/services"
                  aria-current={!categorySlug ? 'page' : undefined}
                  className={cn(
                    'inline-flex min-h-[var(--web-control-height)] items-center rounded-[var(--radius-pill)] border px-4 text-[var(--web-font-size-small)] font-medium transition-colors duration-[var(--duration-hover)]',
                    !categorySlug
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                      : 'border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-primary)]',
                  )}
                >
                  All
                </Link>
              </li>
              {categories.map((category) => {
                const active = category.slug === categorySlug;
                return (
                  <li key={category.id} className="shrink-0">
                    <Link
                      href={`/services?category=${category.slug}`}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'inline-flex min-h-[var(--web-control-height)] items-center rounded-[var(--radius-pill)] border px-4 text-[var(--web-font-size-small)] font-medium transition-colors duration-[var(--duration-hover)]',
                        active
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                          : 'border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-primary)]',
                      )}
                    >
                      {category.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </Container>
      </Section>

      <Section>
        <Container>
          {services.length === 0 ? (
            <div className="rounded-[var(--web-card-radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center">
              <p className="font-medium text-[var(--color-text)]">No services match that.</p>
              <p className="mt-1 text-[var(--web-font-size-small)] text-[var(--color-muted)]">
                Try a different search, or{' '}
                <Link href="/services" className="text-[var(--color-primary)] hover:underline">
                  browse everything
                </Link>
                .
              </p>
            </div>
          ) : (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {services.map((service) => (
                <li key={service.id}>
                  <ServiceCard service={service} />
                </li>
              ))}
            </ul>
          )}
        </Container>
      </Section>
    </main>
  );
}
