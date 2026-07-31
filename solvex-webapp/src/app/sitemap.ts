import type { MetadataRoute } from 'next';
import { getActiveAreas, getRailCategories, getServices } from '@/lib/catalog';
import { SITE, areaSlug } from '@/lib/site-config';

/**
 * Built from the live catalog rather than a hand-written list, so a service
 * added in the CMS is discoverable without anyone remembering to edit a file.
 *
 * Signed-in routes are absent by design — see robots.ts.
 */
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [services, categories, areas] = await Promise.all([
    getServices({}),
    getRailCategories(),
    getActiveAreas(),
  ]);

  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE.url}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE.url}/services`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE.url}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE.url}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE.url}/referral`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE.url}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE.url}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ];

  // Service pages carry the buying intent, so they rank highest after the home
  // and index pages.
  const servicePages: MetadataRoute.Sitemap = services.map((service) => ({
    url: `${SITE.url}/services/${service.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const categoryPages: MetadataRoute.Sitemap = categories
    // A category with nothing bookable in it is not worth a crawl.
    .filter((category) => category.serviceCount > 0)
    .map((category) => ({
      url: `${SITE.url}/services?category=${category.slug}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

  const areaPages: MetadataRoute.Sitemap = areas.map((area) => ({
    url: `${SITE.url}/areas/${areaSlug(area.name)}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.75,
  }));

  return [...staticPages, ...servicePages, ...categoryPages, ...areaPages];
}
