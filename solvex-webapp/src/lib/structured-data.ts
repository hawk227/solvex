import { SITE, areaSlug, hasRealContactDetails } from './site-config';

/**
 * JSON-LD builders.
 *
 * This is the layer that answer engines and LLM-based search actually read.
 * A page can rank perfectly well on text alone, but it will not be *quoted* —
 * by a featured snippet, by an AI overview, or by an assistant answering
 * "who services ACs in Dhanmondi" — unless the facts are machine-readable.
 *
 * Two rules held throughout:
 *
 *  1. Never state anything that is not true. There is no AggregateRating here
 *     and there must never be one until real reviews exist. Fabricated review
 *     markup is a manual-action offence with Google and, more to the point, it
 *     is a lie told to customers.
 *
 *  2. Never emit placeholder contact details. Publishing a fake phone number in
 *     LocalBusiness markup poisons the NAP consistency that local ranking
 *     depends on, and it propagates into directories that scrape it.
 */

type Json = Record<string, unknown>;

/** Drops keys whose values are undefined, so no empty fields reach the output. */
function compact(obj: Json): Json {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

/**
 * The business itself.
 *
 * `HomeAndConstructionBusiness` rather than plain LocalBusiness: it is the
 * closest Schema.org type to appliance repair, and a more specific type gives a
 * search engine more to work with.
 *
 * `areaServed` lists the actual Dhaka neighbourhoods. This is the single most
 * useful signal for "near me" and neighbourhood-qualified queries, which is how
 * most of this demand is actually searched for.
 */
export function localBusinessJsonLd(areas: string[]): Json {
  const real = hasRealContactDetails();

  return compact({
    '@context': 'https://schema.org',
    '@type': 'HomeAndConstructionBusiness',
    '@id': `${SITE.url}/#business`,
    name: SITE.name,
    description: SITE.description,
    url: SITE.url,
    // Omitted entirely rather than published as a placeholder.
    telephone: real ? SITE.telephone : undefined,
    email: real ? SITE.email : undefined,
    address: real
      ? {
          '@type': 'PostalAddress',
          streetAddress: SITE.address.street,
          addressLocality: SITE.address.locality,
          addressRegion: SITE.address.region,
          postalCode: SITE.address.postalCode,
          addressCountry: SITE.address.country,
        }
      : {
          '@type': 'PostalAddress',
          addressLocality: SITE.address.locality,
          addressRegion: SITE.address.region,
          addressCountry: SITE.address.country,
        },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: SITE.geo.latitude,
      longitude: SITE.geo.longitude,
    },
    areaServed: areas.map((name) => ({
      '@type': 'City',
      name: `${name}, Dhaka`,
    })),
    openingHoursSpecification: SITE.openingHours.map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: h.days,
      opens: h.opens,
      closes: h.closes,
    })),
    priceRange: SITE.priceRange,
    currenciesAccepted: SITE.currency,
    paymentAccepted: 'Cash',
    sameAs: SITE.sameAs.length > 0 ? SITE.sameAs : undefined,
    // No aggregateRating. See the note at the top of this file.
  });
}

/**
 * Site-level identity plus the internal search action, which is what lets a
 * search result show a search box for your site.
 */
export function websiteJsonLd(): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE.url}/#website`,
    url: SITE.url,
    name: SITE.name,
    inLanguage: 'en-BD',
    publisher: { '@id': `${SITE.url}/#business` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE.url}/services?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * One bookable service, with its real price.
 *
 * The price comes from the database, not from copy — an `Offer` that disagrees
 * with the page is worse than no Offer, and it is what an assistant will quote
 * when asked "how much is AC cleaning in Dhaka".
 */
export function serviceJsonLd(input: {
  name: string;
  description: string;
  slug: string;
  categoryName: string;
  price: number | null;
  areas: string[];
}): Json {
  return compact({
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${SITE.url}/services/${input.slug}#service`,
    name: input.name,
    description: input.description,
    serviceType: input.categoryName,
    provider: { '@id': `${SITE.url}/#business` },
    areaServed: input.areas.map((name) => ({ '@type': 'City', name: `${name}, Dhaka` })),
    offers:
      input.price === null
        ? undefined
        : {
            '@type': 'Offer',
            price: input.price,
            priceCurrency: SITE.currency,
            availability: 'https://schema.org/InStock',
            url: `${SITE.url}/services/${input.slug}`,
          },
  });
}

/**
 * FAQ markup.
 *
 * The highest-leverage thing on this site for answer engines. Every service
 * already carries real questions and answers written for customers; expressed
 * as FAQPage they become directly quotable by AI overviews and assistants,
 * which is how "is AC gas refill worth it" style questions get answered now.
 *
 * Only ever built from FAQs that are genuinely on the page — invisible markup
 * that does not match visible content is a guidelines violation.
 */
export function faqJsonLd(faqs: { q: string; a: string }[]): Json | null {
  if (faqs.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  };
}

/** Breadcrumbs, which search results render in place of a raw URL. */
export function breadcrumbJsonLd(trail: { name: string; path: string }[]): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE.url}${item.path}`,
    })),
  };
}

/** The three booking steps, as a HowTo — eligible for step-by-step results. */
export function howToBookJsonLd(): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to book appliance servicing in Dhaka',
    description:
      'Book a vetted technician for AC, refrigerator, oven or washing machine servicing in Dhaka, and pay cash after the work is done.',
    totalTime: 'PT3M',
    step: [
      {
        '@type': 'HowToStep',
        position: 1,
        name: 'Pick your service',
        text: 'Choose the appliance and the job. Tell us the details that affect price, like your AC tonnage.',
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: 'Choose a time',
        text: 'Pick a date and one of our service windows. You will see only the slots that still have room.',
      },
      {
        '@type': 'HowToStep',
        position: 3,
        name: 'Relax and pay after',
        text: 'A vetted technician arrives in your window. You pay cash once the work is done — nothing upfront.',
      },
    ],
  };
}

/** Per-neighbourhood page, tying the business to one Dhaka area. */
export function areaServiceJsonLd(area: string, serviceNames: string[]): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${SITE.url}/areas/${areaSlug(area)}#service`,
    name: `Appliance servicing in ${area}, Dhaka`,
    description: `AC, refrigerator, oven and washing machine servicing in ${area}, Dhaka. Fixed prices, vetted technicians, pay cash after the job.`,
    provider: { '@id': `${SITE.url}/#business` },
    areaServed: { '@type': 'City', name: `${area}, Dhaka` },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: `Services available in ${area}`,
      itemListElement: serviceNames.map((name, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name,
      })),
    },
  };
}
