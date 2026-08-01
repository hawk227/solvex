'use client';

import { usePathname } from 'next/navigation';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Check, ChevronDown, Languages } from 'lucide-react';
import { LOCALE_LABEL, LOCALES, type Locale } from '@/lib/i18n';
import { cn } from '@/lib/cn';

/**
 * Language menu: click to open, then choose.
 *
 * A menu rather than two side-by-side buttons. Two buttons show every option at
 * once, which is fine for two languages and stops being fine the moment a third
 * is added — and it reads as a segmented control, where the unselected half
 * looks disabled rather than clickable.
 *
 * The target path is rebuilt from the current one, so switching keeps you on
 * the page you were reading. Being thrown back to the homepage is the fastest
 * way to make someone give up on the language they wanted.
 */
export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();

  // usePathname reports the URL the visitor sees, so /bn is still on the front.
  const bare = pathname === '/bn' ? '/' : pathname.replace(/^\/bn(?=\/|$)/, '') || '/';

  function switchTo(next: Locale) {
    if (next === locale) return;
    const target = next === 'bn' ? (bare === '/' ? '/bn' : `/bn${bare}`) : bare;

    /*
     * A full load, not router.push. The locale is read from a request header in
     * the root layout, and client-side navigation preserves layouts — so
     * pushing changed the URL while <html lang> and the whole header stayed in
     * the previous language.
     */
    window.location.assign(target);
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`Language: ${LOCALE_LABEL[locale]}`}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] px-2.5 text-[var(--web-font-size-small)] font-medium text-[var(--color-text)] transition-colors duration-[var(--duration-hover)] hover:border-[var(--color-primary)]"
        >
          <Languages aria-hidden className="h-4 w-4 text-[var(--color-muted)]" />
          {/* Short form keeps the header tight; the menu spells it out. */}
          <span lang={locale}>{locale === 'bn' ? 'বাং' : 'EN'}</span>
          <ChevronDown aria-hidden className="h-3.5 w-3.5 text-[var(--color-muted)]" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-40 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] p-1 shadow-[var(--shadow-md)]"
        >
          {LOCALES.map((option) => {
            const active = option === locale;
            return (
              <DropdownMenu.Item
                key={option}
                onSelect={() => switchTo(option)}
                // lang tells a screen reader to switch voice for "বাংলা".
                lang={option}
                className={cn(
                  'flex min-h-[var(--web-control-height)] cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-sm)] px-3',
                  'text-[var(--web-font-size-small)] outline-none',
                  'data-[highlighted]:bg-[var(--color-surface)]',
                  active ? 'font-semibold text-[var(--color-text)]' : 'text-[var(--color-muted)]',
                )}
              >
                {LOCALE_LABEL[option]}
                {active && <Check aria-hidden className="h-4 w-4 text-[var(--color-primary)]" />}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
