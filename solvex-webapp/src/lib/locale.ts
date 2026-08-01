import { headers } from 'next/headers';
import { DEFAULT_LOCALE, getDictionary, isLocale, type Dictionary, type Locale } from './i18n';

const LOCALE_HEADER = 'x-solvex-locale';

/**
 * The locale for this request, set by middleware from the URL prefix.
 *
 * Falls back to English rather than throwing: a missing header means a route
 * the matcher skipped, and serving English is a better failure than a 500.
 */
export async function getLocale(): Promise<Locale> {
  const value = (await headers()).get(LOCALE_HEADER) ?? '';
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function getStrings(): Promise<{ locale: Locale; s: Dictionary }> {
  const locale = await getLocale();
  return { locale, s: getDictionary(locale) };
}

/**
 * Prefixes a path for the current locale.
 *
 * Every internal link must go through this, or a Bangla visitor clicking a
 * link lands back in English and silently loses their language.
 */
export function localePath(locale: Locale, path: string): string {
  if (locale === DEFAULT_LOCALE) return path;
  return path === '/' ? '/bn' : `/bn${path}`;
}
