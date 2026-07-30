import { ProsePage, ProseSection } from '@/components/layout/prose-page';

export const metadata = {
  title: 'About us',
  description:
    'SolveX brings vetted appliance technicians to your door in Dhaka, with prices agreed before the work starts.',
};

export default function AboutPage() {
  return (
    <ProsePage
      title="About SolveX"
      intro="We bring vetted appliance technicians to your door in Dhaka, with the price agreed before the work starts."
    >
      <ProseSection heading="Why we exist">
        <p>
          Getting an appliance fixed usually means calling a number someone gave you, waiting
          without a time, and finding out the cost once the work is already done. SolveX replaces
          that with a booking you can see: a fixed price for your exact appliance, a service window
          you choose, and a technician who has been identity-checked.
        </p>
      </ProseSection>

      <ProseSection heading="What we service">
        <p>
          Air conditioners, refrigerators, ovens and washing machines — cleaning, servicing, health
          checks and repairs. Every service page lists exactly what is covered and what is not, so
          there is nothing to negotiate at your door.
        </p>
      </ProseSection>

      <ProseSection heading="How we charge">
        <p>
          Prices are set per appliance specification, so a 2 ton split unit and a 1 ton window unit
          are not quoted the same. You see the price for your selection before you book, and you pay
          the technician in cash once the job is finished. Nothing is charged online.
        </p>
      </ProseSection>

      <ProseSection heading="Where we work">
        <p>
          We currently serve selected areas of Dhaka. The area list at booking shows where we can
          reach today, and it grows as we add technicians.
        </p>
      </ProseSection>
    </ProsePage>
  );
}
