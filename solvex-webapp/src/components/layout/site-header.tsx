import Link from 'next/link';
import { Container } from './container';
import { MobileNav } from './mobile-nav';
import { HeaderAuth } from './header-auth';

const LINKS = [
  { href: '/services', label: 'All Services' },
  { href: '/about', label: 'About' },
  { href: '/referral', label: 'Refer & Earn' },
  { href: '/contact', label: 'Contact' },
] as const;

/**
 * Stays a static server component. The session-dependent piece is HeaderAuth, a
 * client component — reading the session here would make every page dynamic,
 * including the static marketing pages.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-background)]">
      <Container>
        <div className="flex h-[var(--web-header-height)] items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2" aria-label="SolveX home">
            <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] text-base font-bold text-[var(--color-primary-foreground)]">
              S
            </span>
            <span className="text-lg font-bold text-[var(--color-text)]">SolveX</span>
          </Link>

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
            <HeaderAuth />
            <MobileNav links={LINKS} />
          </div>
        </div>
      </Container>
    </header>
  );
}
