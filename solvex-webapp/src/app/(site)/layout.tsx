import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { CookieNotice } from '@/components/layout/cookie-notice';

/**
 * The public site: marketing pages, the catalog, and the auth screens.
 *
 * Signed-in pages live under (app) and deliberately do NOT get this chrome —
 * once someone is logged in, the marketing nav is noise around the thing they
 * actually came to do.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
      <CookieNotice />
    </>
  );
}
