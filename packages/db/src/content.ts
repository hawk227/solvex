import type { Faq } from './schema/catalog';

/**
 * Parsers for the service content JSON columns. They live beside the schema
 * because they define the shape those columns are allowed to hold.
 */

/** One item per line; blank lines and surrounding whitespace dropped. */
export function parseList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * FAQ blocks separated by a blank line. The first line of a block is the
 * question, the remaining lines join into the answer.
 *
 * A block with a question but no answer is DROPPED rather than stored
 * half-formed — a FAQ with an empty answer renders as a broken accordion on
 * the customer-facing page.
 */
export function parseFaqs(raw: string | null | undefined): Faq[] {
  if (!raw) return [];
  return raw
    .split(/\n\s*\n/)
    .map((block) => {
      const lines = block
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      const q = lines[0];
      const a = lines.slice(1).join(' ').trim();
      return q && a ? { q, a } : null;
    })
    .filter((x): x is Faq => x !== null);
}

/** Inverse of parseList, for populating the edit form. */
export function listToText(items: string[] | null | undefined): string {
  return (items ?? []).join('\n');
}

/** Inverse of parseFaqs, for populating the edit form. */
export function faqsToText(faqs: Faq[] | null | undefined): string {
  return (faqs ?? []).map((f) => `${f.q}\n${f.a}`).join('\n\n');
}
