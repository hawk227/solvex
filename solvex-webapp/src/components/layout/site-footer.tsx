import Link from 'next/link';
import { Container } from './container';

const COLUMNS = [
  {
    title: 'Services',
    links: [
      { href: '/services', label: 'All services' },
      { href: '/services?category=air-conditioner', label: 'AC servicing' },
      { href: '/services?category=refrigerator', label: 'Fridge repair' },
      { href: '/services?category=washing-machine', label: 'Washer repair' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About us' },
      { href: '/contact', label: 'Contact' },
      { href: '/referral', label: 'Refer & earn' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/terms', label: 'Terms & conditions' },
      { href: '/privacy', label: 'Privacy policy' },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      <Container>
        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] text-base font-bold text-[var(--color-primary-foreground)]">
                S
              </span>
              <span className="text-lg font-bold">SolveX</span>
            </div>
            <p className="mt-3 max-w-[32ch] text-[var(--web-font-size-small)] text-[var(--color-muted)]">
              Appliance servicing at your door in Dhaka. AC, fridge, oven and washing machine
              experts, booked in minutes.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h2 className="mb-3 text-[var(--web-font-size-small)] font-bold uppercase tracking-wide text-[var(--color-text)]">
                {column.title}
              </h2>
              <ul className="flex flex-col gap-2">
                {column.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="text-[var(--web-font-size-small)] text-[var(--color-muted)] transition-colors duration-[var(--duration-hover)] hover:text-[var(--color-primary)]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t border-[var(--color-border)] py-6 text-[var(--web-font-size-caption)] text-[var(--color-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} SolveX. All rights reserved.</p>
          <p>Dhaka, Bangladesh · Cash on service</p>
        </div>
      </Container>
    </footer>
  );
}
