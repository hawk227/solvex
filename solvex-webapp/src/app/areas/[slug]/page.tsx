import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Container, Section } from '@/components/layout/container';
import { ServiceCard } from '@/components/ui/service-card';
import { Button } from '@/components/ui/button';
import { JsonLd } from '@/components/json-ld';
import { getActiveAreas, getServices } from '@/lib/catalog';
import { areaSlug } from '@/lib/site-config';
import { areaServiceJsonLd, breadcrumbJsonLd } from '@/lib/structured-data';

export const dynamic = 'force-dynamic';

async function findArea(slug: string) {
  const areas = await getActiveAreas();
  return areas.find((area) => areaSlug(area.name) === slug) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const area = await findArea(slug);
  if (!area) return { title: 'Area not found' };

  // Neighbourhood-qualified title and description: this is how the demand is
  // actually searched for — "ac servicing dhanmondi", not "ac servicing dhaka".
  const title = `Appliance Servicing in ${area.name}, Dhaka — AC, Fridge, Oven & Washing Machine`;
  const description = `Book AC, refrigerator, oven and washing machine servicing in ${area.name}, Dhaka. Fixed prices shown upfront, vetted technicians, and you pay cash only after the job is done.`;

  return {
    title,
    description,
    alternates: { canonical: `/areas/${slug}` },
    openGraph: { title, description, type: 'website', locale: 'en_BD' },
  };
}

export default async function AreaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const area = await findArea(slug);
  if (!area) notFound();

  const services = await getServices({});

  return (
    <main className="flex-1">
      <JsonLd data={areaServiceJsonLd(area.name, services.map((s) => s.name))} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Areas', path: '/services' },
          { name: area.name, path: `/areas/${slug}` },
        ])}
      />

      <Section>
        <Container>
          <nav aria-label="Breadcrumb" className="text-[var(--web-font-size-small)] text-[var(--color-muted)]">
            <Link href="/" className="hover:text-[var(--color-text)]">
              Home
            </Link>
            <span aria-hidden> / </span>
            <span className="text-[var(--color-text)]">{area.name}</span>
          </nav>

          <h1 className="mt-3 text-3xl font-semibold text-[var(--color-text)] md:text-4xl">
            Appliance servicing in {area.name}, Dhaka
          </h1>

          <p className="mt-4 max-w-2xl text-[var(--web-font-size-body)] text-[var(--color-muted)]">
            We service air conditioners, refrigerators, ovens and washing machines across{' '}
            {area.name}. You see the price for your exact appliance before you book, a vetted
            technician arrives inside your chosen window, and you pay cash once the work is done —
            nothing upfront.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/services">Browse services</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/contact">Ask a question</Link>
            </Button>
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <h2 className="text-2xl font-semibold text-[var(--color-text)]">
            Services available in {area.name}
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <ServiceCard key={service.slug} service={service} />
            ))}
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <h2 className="text-2xl font-semibold text-[var(--color-text)]">
            Why {area.name} customers book us
          </h2>
          <ul className="mt-5 grid max-w-3xl gap-4 sm:grid-cols-2">
            <li>
              <p className="font-medium text-[var(--color-text)]">Same service windows</p>
              <p className="mt-1 text-[var(--web-font-size-small)] text-[var(--color-muted)]">
                Morning, midday and afternoon slots, seven days a week, with live availability so
                you never pick a window that is already full.
              </p>
            </li>
            <li>
              <p className="font-medium text-[var(--color-text)]">Fixed, visible pricing</p>
              <p className="mt-1 text-[var(--web-font-size-small)] text-[var(--color-muted)]">
                The price for your exact appliance is shown before you book. No callout fee added
                at the door.
              </p>
            </li>
            <li>
              <p className="font-medium text-[var(--color-text)]">Identity-checked technicians</p>
              <p className="mt-1 text-[var(--web-font-size-small)] text-[var(--color-muted)]">
                Every technician is checked before they take a job, and you are told who is coming.
              </p>
            </li>
            <li>
              <p className="font-medium text-[var(--color-text)]">Pay after, in cash</p>
              <p className="mt-1 text-[var(--web-font-size-small)] text-[var(--color-muted)]">
                Nothing is charged when you place the order. You pay only once the work is done and
                you are happy with it.
              </p>
            </li>
          </ul>
        </Container>
      </Section>
    </main>
  );
}
