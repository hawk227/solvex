/**
 * Bangla and English strings for the public site.
 *
 * ── Scope, stated up front ──────────────────────────────────────────────────
 * This translates the site's own CHROME and copy — navigation, headings,
 * marketing sections, form labels. It does NOT translate catalogue content:
 * service names, descriptions, "what's included" lists and per-service FAQs all
 * live in the database in English, and translating them needs Bangla columns in
 * the schema and matching fields in the CMS. Until that exists a Bangla visitor
 * sees Bangla page furniture around English service copy.
 *
 * That is a real limitation, not an oversight. Half-translating by machine at
 * render time would be worse: prices, appliance names and the inclusion lists
 * are exactly the content where a wrong word costs money or an argument at the
 * door.
 *
 * The Bangla here is a translation of the English, as asked. It has not been
 * reviewed by a native speaker, and marketing register is the part machine
 * translation gets subtly wrong — worth an editing pass before it carries real
 * traffic.
 */

/**
 * Whether /bn routes actually exist yet.
 *
 * The dictionary, switcher and hreflang are all built, but the routing is
 * blocked (see the commit that added this). Flipping this to true without the
 * routes would point every switcher click at a 404, so it gates the UI.
 */
export const LOCALE_ROUTING_READY = false;

export const LOCALES = ['en', 'bn'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** Native names, so the switcher reads in the language it offers. */
export const LOCALE_LABEL: Record<Locale, string> = {
  en: 'English',
  bn: 'বাংলা',
};

const en = {
  nav: {
    services: 'All Services',
    about: 'About',
    referral: 'Refer & Earn',
    contact: 'Contact',
    login: 'Log in',
    signup: 'Sign up',
    dashboard: 'Dashboard',
    bookings: 'Your bookings',
    support: 'Support',
    account: 'Your account',
    signOut: 'Sign out',
  },
  hero: {
    title: 'Appliance experts at your door',
    subtitle:
      'AC, fridge, oven and washing machine servicing across Dhaka. Fixed prices, vetted technicians, pay cash after the job.',
    area: 'Your area',
    allAreas: 'All areas',
    searchPlaceholder: 'Find a service, e.g. AC cleaning',
    search: 'Search',
  },
  home: {
    popularEyebrow: 'Popular',
    popularTitle: 'Most booked services',
    viewAll: 'View all',
    howEyebrow: 'How it works',
    howTitle: 'Booked in three steps',
    whyEyebrow: 'Why SolveX',
    whyTitle: 'Straightforward home servicing',
    areasEyebrow: 'Where we work',
    areasTitle: 'Covering {count} areas across Dhaka',
    areasBody:
      'Same prices and the same service windows in every one. Not listed? Tell us where you are — we add areas as technicians come on.',
    faqEyebrow: 'Before you book',
    faqTitle: 'Common questions',
    referralTitle: 'Refer a friend, both get credit',
    referralBody:
      'Share your code. When their first booking is completed, your account is credited towards your next service.',
    referralCta: 'How referrals work',
  },
  common: {
    from: 'from',
    bookNow: 'Book now',
    services: 'services',
    service: 'service',
    language: 'Language',
  },
};

/**
 * Same shape as `en`, enforced by the annotation. `en` is deliberately NOT
 * `as const` — literal types would demand Bangla equal the English string.
 */
const bn: typeof en = {
  nav: {
    services: 'সব সার্ভিস',
    about: 'আমাদের সম্পর্কে',
    referral: 'রেফার করুন',
    contact: 'যোগাযোগ',
    login: 'লগ ইন',
    signup: 'সাইন আপ',
    dashboard: 'ড্যাশবোর্ড',
    bookings: 'আপনার বুকিং',
    support: 'সহায়তা',
    account: 'আপনার অ্যাকাউন্ট',
    signOut: 'সাইন আউট',
  },
  hero: {
    title: 'আপনার দরজায় অ্যাপ্লায়েন্স বিশেষজ্ঞ',
    subtitle:
      'ঢাকা জুড়ে এসি, ফ্রিজ, ওভেন ও ওয়াশিং মেশিন সার্ভিসিং। নির্ধারিত মূল্য, যাচাই করা টেকনিশিয়ান, কাজ শেষে নগদে পরিশোধ।',
    area: 'আপনার এলাকা',
    allAreas: 'সব এলাকা',
    searchPlaceholder: 'সার্ভিস খুঁজুন, যেমন এসি ক্লিনিং',
    search: 'খুঁজুন',
  },
  home: {
    popularEyebrow: 'জনপ্রিয়',
    popularTitle: 'সবচেয়ে বেশি বুক হওয়া সার্ভিস',
    viewAll: 'সব দেখুন',
    howEyebrow: 'কীভাবে কাজ করে',
    howTitle: 'তিন ধাপে বুকিং',
    whyEyebrow: 'কেন সলভএক্স',
    whyTitle: 'ঝামেলাহীন হোম সার্ভিসিং',
    areasEyebrow: 'আমরা যেখানে কাজ করি',
    areasTitle: 'ঢাকার {count}টি এলাকায় সেবা',
    areasBody:
      'প্রতিটি এলাকায় একই মূল্য এবং একই সার্ভিস সময়। আপনার এলাকা তালিকায় নেই? আমাদের জানান — টেকনিশিয়ান যুক্ত হওয়ার সাথে সাথে আমরা নতুন এলাকা যোগ করি।',
    faqEyebrow: 'বুক করার আগে',
    faqTitle: 'সাধারণ প্রশ্ন',
    referralTitle: 'বন্ধুকে রেফার করুন, দুজনেই ক্রেডিট পান',
    referralBody:
      'আপনার কোড শেয়ার করুন। তাদের প্রথম বুকিং সম্পন্ন হলে আপনার অ্যাকাউন্টে পরবর্তী সার্ভিসের জন্য ক্রেডিট যোগ হবে।',
    referralCta: 'রেফারেল কীভাবে কাজ করে',
  },
  common: {
    from: 'শুরু',
    bookNow: 'এখনই বুক করুন',
    services: 'সার্ভিস',
    service: 'সার্ভিস',
    language: 'ভাষা',
  },
};

const DICTIONARIES = { en, bn } as const;

export type Dictionary = typeof en;

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

/** Fills {name} placeholders. Kept trivial — no template engine for six strings. */
export function t(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in values ? String(values[key]) : match,
  );
}
