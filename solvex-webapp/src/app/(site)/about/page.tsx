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

      <ProseSection heading="How technicians are checked">
        <p>
          Every technician is identity-verified before they are allowed to take a job, and each one
          is recorded against the appliance categories and the areas they actually cover — so the
          person sent to a refrigerator fault is someone who works on refrigerators. Once assigned,
          their name appears on your booking before they arrive. Nobody turns up unannounced.
        </p>
      </ProseSection>

      <ProseSection heading="What we do not do">
        <p>
          We are a servicing and repair business, not a parts shop and not an installer. We do not
          sell appliances, we do not do new installations, and we do not quote for work sight
          unseen over the phone. Replacement parts and refrigerant gas are charged separately, and
          the technician confirms the cost with you before fitting anything — if a repair is not
          worth doing, you will be told that rather than sold it.
        </p>
      </ProseSection>

      <ProseSection heading="We are new, and we would rather say so">
        <p>
          SolveX is early. We do not have a decade of reviews or a fleet of vans, and you will not
          find invented numbers on this site claiming otherwise. What we have is a straightforward
          arrangement: a fixed price you see before booking, a window you choose rather than a
          promise to come sometime, an identity-checked technician, and no money changing hands
          until the work is done and you are satisfied with it.
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
