import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site-config';

/**
 * Signed-in areas are excluded — they are per-customer, never useful in a
 * result, and crawling them wastes budget that should go on service pages.
 *
 * AI crawlers are deliberately ALLOWED. Being quotable by assistants is the
 * point of the structured data on this site; blocking them would win nothing
 * and cost the visibility that AEO is for.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/account', '/orders', '/support', '/profile', '/verify', '/api/'],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
