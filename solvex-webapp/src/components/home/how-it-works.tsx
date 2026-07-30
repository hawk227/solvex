import { Container, Section, SectionHeading } from '@/components/layout/container';

const STEPS = [
  {
    title: 'Pick your service',
    body: 'Choose the appliance and the job. Tell us the details that affect price, like your AC tonnage.',
  },
  {
    title: 'Choose a time',
    body: 'Pick a date and one of our service windows. You will see only the slots that still have room.',
  },
  {
    title: 'Relax and pay after',
    body: 'A vetted technician arrives in your window. You pay cash once the work is done — nothing upfront.',
  },
] as const;

export function HowItWorks() {
  return (
    <Section className="bg-[var(--color-surface)]">
      <Container>
        <SectionHeading eyebrow="How it works" title="Booked in three steps" />

        <ol className="grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="rounded-[var(--web-card-radius)] border border-[var(--color-border)] bg-[var(--color-card)] p-6"
            >
              <span
                aria-hidden
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary)] font-bold text-[var(--color-primary-foreground)]"
              >
                {i + 1}
              </span>
              <h3 className="mt-4 font-semibold text-[var(--color-text)]">{step.title}</h3>
              <p className="mt-2 text-[var(--web-font-size-small)] text-[var(--color-muted)]">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}
