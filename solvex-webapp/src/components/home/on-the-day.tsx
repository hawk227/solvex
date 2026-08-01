import { Container, Section } from '@/components/layout/container';

/**
 * What actually happens once you book.
 *
 * The page already says "how it works" in three marketing steps. This is the
 * different, harder question people are really asking: what happens when a
 * stranger is coming to my home, and where does it go wrong?
 *
 * So it names the two moments customers actually worry about — being told the
 * price has changed once the appliance is in pieces, and paying before the work
 * is right — and says plainly how each is handled. Numbered because it IS a
 * sequence; the order carries the reassurance.
 *
 * Everything here describes behaviour the product already enforces: assignment
 * is visible on the dashboard, prices are fixed per specification, payment is
 * cash on completion, and cancellation is available while a booking is pending
 * or confirmed. Nothing is a promise the business has not already made.
 */
const STEPS = [
  {
    time: 'When you book',
    title: 'Nothing is charged',
    body: 'You choose the service, the date and one of three windows. No card, no deposit, no callout fee. The price you see is for your exact appliance specification.',
  },
  {
    time: 'Before the day',
    title: 'You see who is coming',
    body: 'Once a technician is assigned, their name appears on your booking. Every technician is identity-checked before they take any job.',
  },
  {
    time: 'On the day',
    title: 'They arrive in your window',
    body: 'Morning, midday or afternoon — whichever you picked. You are not asked to wait all day for a van that might come.',
  },
  {
    time: 'During the work',
    title: 'Extra costs are agreed first',
    body: 'If a part or refrigerant gas is needed, the technician tells you the cost and waits for your answer. Nothing is fitted, and nothing is added to your bill, without you saying yes.',
  },
  {
    time: 'When it is done',
    title: 'You pay in cash',
    body: 'Once the work is finished and you are happy with it. If something is not right afterwards, open a ticket from your account and we will pick it up.',
  },
];

export function OnTheDay() {
  return (
    <Section>
      <Container>
        <div className="flex flex-col gap-2">
          <p className="text-[var(--web-font-size-caption)] font-bold uppercase tracking-wide text-[var(--color-primary)]">
            No surprises
          </p>
          <h2 className="max-w-[20ch] text-2xl font-semibold text-[var(--color-text)] md:text-3xl">
            What actually happens when you book
          </h2>
        </div>

        <ol className="mt-8 grid gap-x-8 gap-y-7 md:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative pl-11">
              {/* The number is the structure: this is a sequence, not a list of features. */}
              <span
                aria-hidden
                className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--web-font-size-caption)] font-bold text-[var(--color-primary)]"
              >
                {i + 1}
              </span>
              <p className="text-[var(--web-font-size-caption)] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                {step.time}
              </p>
              <h3 className="mt-1 font-semibold text-[var(--color-text)]">{step.title}</h3>
              <p className="mt-1.5 text-[var(--web-font-size-small)] leading-relaxed text-[var(--color-muted)]">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}
