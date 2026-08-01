'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Languages } from 'lucide-react';
import { LOCALE_LABEL, LOCALES, type Locale } from '@/lib/i18n';
import { cn } from '@/lib/cn';

/**
 * Switches language while staying on the same page.
 *
 * Rebuilt from the current pathname rather than linking to the other homepage:
 * being thrown back to the top of the site is the fastest way to make someone
 * give up on the language they wanted.
 */
export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const router = useRouter();

  // usePathname reports the URL the visitor sees, so /bn is still on the front.
  const bare = pathname === '/bn' ? '/' : pathname.replace(/^\/bn(?=\/|$)/, '') || '/';

  function switchTo(next: Locale) {
    router.push(next === 'bn' ? (bare === '/' ? '/bn' : `/bn${bare}`) : bare);
  }

  return (
    <div className="flex items-center rounded-[var(--radius-pill)] border border-[var(--color-border)] p-0.5">
      <Languages aria-hidden className="mx-1.5 h-4 w-4 shrink-0 text-[var(--color-muted)]" />
      {LOCALES.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => switchTo(option)}
          aria-current={option === locale ? 'true' : undefined}
          // lang tells a screen reader to switch voice for "বাংলা".
          lang={option}
          className={cn(
            'rounded-[var(--radius-pill)] px-2.5 py-1 text-[var(--web-font-size-caption)] font-medium',
            'transition-colors duration-[var(--duration-hover)]',
            option === locale
              ? 'bg-[var(--color-text)] text-white'
              : 'text-[var(--color-muted)] hover:text-[var(--color-text)]',
          )}
        >
          {option === 'bn' ? LOCALE_LABEL.bn : 'EN'}
        </button>
      ))}
    </div>
  );
}
