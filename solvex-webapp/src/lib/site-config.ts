/**
 * Business identity, in one place.
 *
 * Search engines, Google Business Profile, directories and the structured data
 * on this site must all state the SAME name, address and phone. That
 * consistency ("NAP consistency") is one of the strongest local ranking signals
 * there is, and the fastest way to lose it is to have the details typed out in
 * five files that drift apart.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * VALUES MARKED `NEEDS REAL VALUE` ARE PLACEHOLDERS.
 *
 * They are deliberately obvious rather than invented. A plausible-looking fake
 * phone number or street address is worse than an empty one: it gets published
 * in structured data, indexed, copied into directories, and then contradicts
 * your real Google Business Profile — which actively suppresses local ranking.
 * Fill these in before launch.
 * ────────────────────────────────────────────────────────────────────────────
 */
export const SITE = {
  name: 'SolveX',
  legalName: 'SolveX', // NEEDS REAL VALUE — registered trading name
  url: 'https://solvex-webapp.long-lab-43ff.workers.dev', // NEEDS REAL VALUE — your own domain
  description:
    'Book AC, refrigerator, oven and washing machine servicing in Dhaka. Vetted technicians, fixed prices, pay cash after the job.',

  telephone: '+880 0000 000000', // NEEDS REAL VALUE
  email: 'hello@solvex.example', // NEEDS REAL VALUE

  address: {
    street: 'NEEDS REAL VALUE', // e.g. 'House 12, Road 5, Dhanmondi'
    locality: 'Dhaka',
    region: 'Dhaka Division',
    postalCode: 'NEEDS REAL VALUE',
    country: 'BD',
  },

  /** Dhaka city centre. Replace with your actual premises once you have one. */
  geo: { latitude: 23.8103, longitude: 90.4125 },

  /** Service windows, matching the bookable slots. */
  openingHours: [{ days: ['Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday'], opens: '09:00', closes: '18:00' }],

  currency: 'BDT',
  priceRange: '৳৳',

  /**
   * Social and directory profiles. `sameAs` is how a search engine confirms
   * that this site, your Facebook page and your Google listing are one
   * business — leave entries out rather than guessing at URLs.
   */
  sameAs: [] as string[], // NEEDS REAL VALUES — Facebook, Instagram, Google Business Profile
} as const;

/** True once the details above are real, used to avoid publishing placeholders. */
export function hasRealContactDetails(): boolean {
  return (
    !SITE.telephone.includes('0000 000000') &&
    !SITE.email.endsWith('.example') &&
    !SITE.address.street.startsWith('NEEDS')
  );
}

/** URL-safe area segment, e.g. "Bashundhara R/A" → "bashundhara-ra". */
export function areaSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
