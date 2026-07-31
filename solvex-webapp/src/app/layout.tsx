import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import { JsonLd } from '@/components/json-ld';
import { SITE } from '@/lib/site-config';
import { websiteJsonLd } from '@/lib/structured-data';
import './globals.css';

const poppins = Poppins({
  variable: '--font-poppins',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  /**
   * Required for absolute URLs in Open Graph and canonical tags. Without it
   * Next emits relative URLs, which social platforms and some crawlers cannot
   * resolve — shared links then preview as bare text.
   */
  metadataBase: new URL(SITE.url),
  alternates: { canonical: '/' },
  title: {
    default: 'SolveX — Appliance servicing at your door in Dhaka',
    template: '%s | SolveX',
  },
  description:
    'Book AC, refrigerator, oven and washing machine servicing in Dhaka. Vetted technicians, fixed prices, pay cash after the job.',
  openGraph: {
    title: 'SolveX — Appliance servicing at your door in Dhaka',
    description:
      'Book AC, refrigerator, oven and washing machine servicing in Dhaka. Pay cash after the job.',
    type: 'website',
    locale: 'en_BD',
    siteName: SITE.name,
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
  // Dhaka is the whole market; this states it explicitly for local ranking.
  other: {
    'geo.region': 'BD-13',
    'geo.placename': 'Dhaka',
    'geo.position': `${SITE.geo.latitude};${SITE.geo.longitude}`,
    ICBM: `${SITE.geo.latitude}, ${SITE.geo.longitude}`,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${poppins.variable} h-full`}>
      <body className="flex min-h-full flex-col antialiased">
        {/* Site-level identity, on every page so crawlers always resolve it. */}
        <JsonLd data={websiteJsonLd()} />
        {children}
      </body>
    </html>
  );
}
