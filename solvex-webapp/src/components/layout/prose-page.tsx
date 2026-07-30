import { Container, Section } from './container';

/**
 * Wrapper for the static content pages. Caps the measure at 70ch per the design
 * system, and keeps exactly one h1 per page.
 */
export function ProsePage({
  title,
  intro,
  updated,
  children,
}: {
  title: string;
  intro?: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex-1">
      <Section>
        <Container>
          <h1 className="text-3xl font-semibold leading-tight text-[var(--color-text)] md:text-4xl">
            {title}
          </h1>
          {intro && (
            <p className="mt-3 max-w-[var(--web-measure)] text-lg text-[var(--color-muted)]">
              {intro}
            </p>
          )}
          {updated && (
            <p className="mt-2 text-[var(--web-font-size-small)] text-[var(--color-muted)]">
              Last updated {updated}
            </p>
          )}

          <div className="mt-10 max-w-[var(--web-measure)] space-y-8">{children}</div>
        </Container>
      </Section>
    </main>
  );
}

export function ProseSection({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-bold text-[var(--color-text)]">{heading}</h2>
      <div className="mt-3 space-y-3 text-[var(--color-muted)]">{children}</div>
    </section>
  );
}
