import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Container } from './container';
import { MobileNav } from './mobile-nav';

const LINKS = [
  { href: '/services', label: 'All Services' },
  { href: '/about', label: 'About' },
  { href: '/referral', label: 'Refer & Earn' },
  { href: '/contact', label: 'Contact' },
] as const;

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
            <Button asChild variant="outline" className="hidden sm:inline-flex">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Sign up</Link>
            </Button>
            <MobileNav links={LINKS} />
          </div>
        </div>
      </Container>
    </header>
  );
}
