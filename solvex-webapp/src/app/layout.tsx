import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import './globals.css';

const poppins = Poppins({
  variable: '--font-poppins',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
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
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${poppins.variable} h-full`}>
      <body className="flex min-h-full flex-col antialiased">
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
