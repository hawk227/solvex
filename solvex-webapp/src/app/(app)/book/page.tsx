import Link from 'next/link';
import { Container, Section } from '@/components/layout/container';
import { ServiceCard } from '@/components/ui/service-card';
import { getRailCategories, getServices } from '@/lib/catalog';
import { requireCustomer } from '@/lib/session';
import { cn } from '@/lib/cn';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Book a service' };

/**
 * The in-app catalogue.
 *
 * Deliberately separate from the public /services page rather than reusing it.
 * That page has a job this one does not — it carries the SEO metadata,
 * structured data and canonical URL for the catalogue, and it has to persuade
 * someone who has not decided yet. This one is for a customer who has already
 * clicked "Book a service", so the cards go straight to the booking form
 * instead of via a marketing page, and there is no sales copy in the way.
 */
export default async function BookPage({ searchParams }: PageProps<'/book'>) {
  await requireCustomer('/book');

  const params = await searchParams;
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  const categorySlug = first(params.category);
  const query = first(params.q);

  const [categories, services] = await Promise.all([
    getRailCategories(),
    getServices({ categorySlug, query }),
  ]);

  const chip = (active: boolean) =>
    cn(
      'inline-flex min-h-10 shrink-0 items-center rounded-[var(--radius-pill)] px-4 text-[var(--web-font-size-small)] font-medium',
      'transition-colors duration-[var(--duration-hover)]',
      active
        ? 'bg-[var(--color-text)] text-white'
        : 'bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-[var(--color-text)]',
    );

  return (
    <main>
      <Section>
        <Container>
          <h1 className="text-2xl font-semibold text-[var(--color-text)] md:text-3xl">
            Book a service
          </h1>
          <p className="mt-2 text-[var(--web-font-size-small)] text-[var(--color-muted)]">
            Prices are fixed and shown before you book. You pay cash once the work is done.
          </p>

          <form method="get" className="mt-6 flex flex-wrap items-center gap-2">
            {categorySlug && <input type="hidden" name="category" value={categorySlug} />}
            <input
              type="search"
              name="q"
              defaultValue={query ?? ''}
              placeholder="Search services, e.g. AC cleaning"
              aria-label="Search services"
              className="h-11 min-w-56 flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-[var(--web-font-size-body)]"
            />
            <button
              type="submit"
              className="inline-flex h-11 items-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-5 text-[var(--web-font-size-small)] font-semibold text-white transition-colors duration-[var(--duration-hover)] hover:bg-[var(--color-primary-hover)]"
            >
              Search
            </button>
          </form>

          <div className="rail mt-4 flex gap-2 overflow-x-auto pb-1">
            <Link href="/book" className={chip(!categorySlug)}>
              All
            </Link>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/book?category=${category.slug}`}
                className={chip(categorySlug === category.slug)}
              >
                {category.name}
              </Link>
            ))}
          </div>

          {services.length === 0 ? (
            <div className="mt-8 rounded-[var(--web-card-radius)] border border-[var(--color-border)] bg-[var(--color-card)] p-10 text-center">
              <p className="font-medium text-[var(--color-text)]">Nothing matches that</p>
              <p className="mt-1 text-[var(--web-font-size-small)] text-[var(--color-muted)]">
                Try a different search, or browse all services.
              </p>
              <Link
                href="/book"
                className="mt-4 inline-flex min-h-11 items-center text-[var(--web-font-size-small)] font-semibold text-[var(--color-primary)] hover:underline"
              >
                Show all services
              </Link>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {services.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  // Straight to the form: they already chose to book.
                  href={`/book/${service.slug}`}
                />
              ))}
            </div>
          )}
        </Container>
      </Section>
    </main>
  );
}
