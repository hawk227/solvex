import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Container, Section, SectionHeading } from '@/components/layout/container';
import { Hero } from '@/components/home/hero';
import { CategoryRail } from '@/components/home/category-rail';
import { HowItWorks } from '@/components/home/how-it-works';
import { WhyChooseUs } from '@/components/home/why-choose-us';
import { AreasCovered } from '@/components/home/areas-covered';
import { HomeFaqs, HOME_FAQS } from '@/components/home/home-faqs';
import { ServiceCard } from '@/components/ui/service-card';
import { Button } from '@/components/ui/button';
import { getActiveAreas, getRailCategories, getServices } from '@/lib/catalog';
import { JsonLd } from '@/components/json-ld';
import { faqJsonLd, howToBookJsonLd, localBusinessJsonLd } from '@/lib/structured-data';

// Reads D1 at request time; there is no binding during the build, so this
// segment must not be prerendered. Cache at the edge later if load demands it.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [areas, categories, popular] = await Promise.all([
    getActiveAreas(),
    getRailCategories(),
    getServices({ limit: 8 }),
  ]);

  return (
    <main className="flex-1">
      {/* The business, and the neighbourhoods it serves. */}
      <JsonLd data={localBusinessJsonLd(areas.map((a) => a.name))} />
      <JsonLd data={howToBookJsonLd()} />
      {/* Same questions and answers as render below — never markup-only. */}
      <JsonLd data={faqJsonLd(HOME_FAQS)} />
      <Hero areas={areas} />
      <CategoryRail categories={categories} />

      <Section>
        <Container>
          <SectionHeading
            eyebrow="Popular"
            title="Most booked services"
            action={
              <Button asChild variant="outline">
                <Link href="/services">
                  View all
                  <ArrowRight aria-hidden className="h-4 w-4" />
                </Link>
              </Button>
            }
          />

          {popular.length === 0 ? (
            <p className="text-[var(--color-muted)]">
              Services are being added. Check back shortly.
            </p>
          ) : (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {popular.map((service) => (
                <li key={service.id}>
                  <ServiceCard service={service} />
                </li>
              ))}
            </ul>
          )}
        </Container>
      </Section>

      <HowItWorks />
      <WhyChooseUs />
      <AreasCovered areas={areas} />
      <HomeFaqs />

      <Section className="bg-[var(--color-text)]">
        <Container>
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-bold text-white md:text-3xl">
                Refer a friend, both get credit
              </h2>
              <p className="mt-2 max-w-[52ch] text-white/80">
                Share your code. When their first booking is completed, your account is credited
                towards your next service.
              </p>
            </div>
            <Button asChild size="lg" className="shrink-0">
              <Link href="/referral">How referrals work</Link>
            </Button>
          </div>
        </Container>
      </Section>
    </main>
  );
}
