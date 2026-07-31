/**
 * Renders JSON-LD.
 *
 * Server-rendered in the body rather than injected on the client: crawlers and
 * LLM fetchers that do not execute JavaScript must still see it, and many do
 * not.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return null;
  return (
    <script
      type="application/ld+json"
      // Content is built by us from database values, never from user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
