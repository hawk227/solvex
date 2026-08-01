import { Container } from './container';
import { LogoLink } from '@/components/ui/logo';
import Link from 'next/link';
import { MobileNav } from './mobile-nav';
import { HeaderAuth } from './header-auth';
import { LanguageSwitcher } from './language-switcher';
import { getStrings, localePath } from '@/lib/locale';
import { LOCALE_ROUTING_READY } from '@/lib/i18n';

/**
 * The session-dependent piece is HeaderAuth, a client component: reading the
 * session here would be a second reason for every page to be dynamic.
 *
 * Reading the locale, however, does make this dynamic. That cost is accepted —
 * nearly every page already reads the catalogue from D1, and the alternative is
 * threading a locale prop through the layout into every page.
 */
export async function SiteHeader() {
  const { locale, s } = await getStrings();

  const LINKS = [
    { href: localePath(locale, '/services'), label: s.nav.services },
    { href: localePath(locale, '/about'), label: s.nav.about },
    { href: localePath(locale, '/referral'), label: s.nav.referral },
    { href: localePath(locale, '/contact'), label: s.nav.contact },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-background)]">
      <Container>
        <div className="flex h-[var(--web-header-height)] items-center justify-between gap-4">
          <LogoLink />

          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-[var(--radius-md)] px-3 py-2 text-[var(--web-font-size-small)] font-medium text-[var(--color-text)] transition-colors duration-[var(--duration-hover)] hover:text-[var(--color-primary)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {/*
              Hidden until /bn routes exist. Shipping the switcher now would
              send every visitor who clicks বাংলা to a 404 — worse than not
              offering the language at all.
            */}
            {LOCALE_ROUTING_READY && <LanguageSwitcher locale={locale} />}
            <HeaderAuth />
            <MobileNav links={LINKS} />
          </div>
        </div>
      </Container>
    </header>
  );
}
