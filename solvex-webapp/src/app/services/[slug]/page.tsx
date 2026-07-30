import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check, Clock, X } from 'lucide-react';
import { Container, Section } from '@/components/layout/container';
import { Button } from '@/components/ui/button';
import { Faqs } from '@/components/ui/faqs';
import { PriceSelector } from './price-selector';
import { getServiceBySlug, getServicePrices, getServiceVariables } from '@/lib/catalog';
import { formatDuration, formatTaka } from '@/lib/format';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps<'/services/[slug]'>) {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) return { title: 'Service not found' };

  return {
    title: service.name,
    description:
      service.shortDesc ??
      `Book ${service.name} in Dhaka with SolveX. Fixed pricing, pay cash after the job.`,
    alternates: { canonical: `/services/${service.slug}` },
  };
}

export default async function ServiceDetailPage({ params }: PageProps<'/services/[slug]'>) {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) notFound();

  const [groups, prices] = await Promise.all([
    getServiceVariables(service.id),
    getServicePrices(service.id),
  ]);

  const included = service.includedJson ?? [];
  const notIncluded = service.notIncludedJson ?? [];
  const faqs = service.faqsJson ?? [];

  return (
    <main className="flex-1">
      <Section className="!pb-0">
        <Container>
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex flex-wrap items-center gap-2 text-[var(--web-font-size-small)] text-[var(--color-muted)]">
              <li>
                <Link href="/services" className="hover:text-[var(--color-primary)]">
                  All services
                </Link>
              </li>
              <li aria-hidden>›</li>
              <li>
                <Link
                  href={`/services?category=${service.categorySlug}`}
                  className="hover:text-[var(--color-primary)]"
                >
                  {service.categoryName}
                </Link>
              </li>
              <li aria-hidden>›</li>
              <li className="font-medium text-[var(--color-text)]">{service.name}</li>
            </ol>
          </nav>

          <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
            <div>
              {service.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={service.imageUrl}
                  alt=""
                  className="mb-6 aspect-[16/9] w-full rounded-[var(--web-card-radius)] object-cover"
                />
              )}

              <h1 className="text-3xl font-semibold leading-tight text-[var(--color-text)] md:text-4xl">
                {service.name}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-4 text-[var(--web-font-size-small)] text-[var(--color-muted)]">
                {service.durationMin && (
                  <span className="flex items-center gap-1.5">
                    <Clock aria-hidden className="h-4 w-4" />
                    About {formatDuration(service.durationMin)}
                  </span>
                )}
                {service.fromPrice !== null && (
                  <span>From {formatTaka(service.fromPrice)}</span>
                )}
                <span>Pay cash after the job</span>
              </div>

              {service.shortDesc && (
                <p className="mt-4 max-w-[var(--web-measure)] text-[var(--color-muted)]">
                  {service.shortDesc}
                </p>
              )}

              {service.aboutMd && (
                <section className="mt-10">
                  <h2 className="text-xl font-bold text-[var(--color-text)]">About this service</h2>
                  {/*
                    Rendered as plain paragraphs, not HTML. The field is authored
                    in the CMS as markdown, but injecting it as HTML would be an
                    XSS path from an admin field straight into every visitor's
                    browser. Add a sanitising markdown renderer before enabling
                    rich formatting here.
                  */}
                  <div className="mt-3 max-w-[var(--web-measure)] space-y-3 text-[var(--color-muted)]">
                    {service.aboutMd
                      .split(/\n\s*\n/)
                      .map((para) => para.trim())
                      .filter(Boolean)
                      .map((para, i) => (
                        <p key={i}>{para}</p>
                      ))}
                  </div>
                </section>
              )}

              {(included.length > 0 || notIncluded.length > 0) && (
                <section className="mt-10 grid gap-6 sm:grid-cols-2">
                  {included.length > 0 && (
                    <div>
                      <h2 className="text-xl font-bold text-[var(--color-text)]">
                        What&apos;s included
                      </h2>
                      <ul className="mt-3 space-y-2">
                        {included.map((item) => (
                          <li key={item} className="flex gap-2 text-[var(--color-muted)]">
                            <Check
                              aria-hidden
                              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-success)]"
                            />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {notIncluded.length > 0 && (
                    <div>
                      <h2 className="text-xl font-bold text-[var(--color-text)]">Not included</h2>
                      <ul className="mt-3 space-y-2">
                        {notIncluded.map((item) => (
                          <li key={item} className="flex gap-2 text-[var(--color-muted)]">
                            <X
                              aria-hidden
                              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-danger)]"
                            />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              )}

              {faqs.length > 0 && (
                <section className="mt-10">
                  <h2 className="text-xl font-bold text-[var(--color-text)]">
                    Frequently asked questions
                  </h2>
                  <Faqs faqs={faqs} />
                </section>
              )}
            </div>

            <aside className="lg:sticky lg:top-[calc(var(--web-header-height)+1.5rem)] lg:self-start">
              <PriceSelector
                serviceSlug={service.slug}
                groups={groups}
                prices={prices}
                fallbackPrice={service.fromPrice}
              />
            </aside>
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <div className="rounded-[var(--web-card-radius)] bg-[var(--color-surface)] p-6 text-center md:p-10">
            <h2 className="text-xl font-bold text-[var(--color-text)]">
              Not sure which service you need?
            </h2>
            <p className="mx-auto mt-2 max-w-[52ch] text-[var(--color-muted)]">
              Tell us the appliance and the symptom, and we will point you to the right job.
            </p>
            <Button asChild size="lg" className="mt-5">
              <Link href="/contact">Contact us</Link>
            </Button>
          </div>
        </Container>
      </Section>
    </main>
  );
}
