import { Container, Section } from '@/components/layout/container';
import { Faqs } from '@/components/ui/faqs';
import { getStrings } from '@/lib/locale';

/**
 * Questions people actually ask before booking a repair.
 *
 * Every answer here is something the site already does — fixed prices, cash on
 * completion, published inclusions. Nothing invents a policy the business has
 * not agreed to: there is no warranty claim, no response-time promise, and no
 * refund terms, because those are commitments only the owner can make.
 *
 * Doubles as the strongest AEO surface on the site. Real questions with real
 * answers are what an AI overview or assistant quotes when someone asks "do
 * appliance repair services in Dhaka charge a callout fee".
 */
export const HOME_FAQS = [
  {
    q: 'How much does it cost?',
    a: 'The price for your exact appliance is shown before you book, and it does not change afterwards. There is no separate callout or inspection fee on top.',
  },
  {
    q: 'Do I have to pay anything upfront?',
    a: 'No. Nothing is charged when you place the order. You pay the technician in cash once the work is done.',
  },
  {
    q: 'Which parts of Dhaka do you cover?',
    a: 'Dhanmondi, Gulshan, Banani, Uttara, Mirpur, Mohammadpur, Bashundhara R/A and Motijheel, at the same prices in every area.',
  },
  {
    q: 'How soon can a technician come?',
    a: 'You pick the date and one of three service windows — 9am to 12pm, 12pm to 3pm, or 3pm to 6pm. The booking page shows only the windows that still have room, so whatever you can select is genuinely available.',
  },
  {
    q: 'What is included in the price?',
    a: 'Every service lists what it covers and what it does not before you book. Replacement parts and refrigerant gas are charged separately, and the technician confirms the cost with you before fitting anything.',
  },
  {
    q: 'Who comes to my home?',
    a: 'A technician whose identity has been checked before they take any job. You can see who is assigned to your booking on your dashboard.',
  },
  {
    q: 'Can I change or cancel a booking?',
    a: 'Yes. A booking can be cancelled from your bookings page while it is still awaiting confirmation or confirmed. Once a technician is on the way, message us and we will sort it out.',
  },
];

export async function HomeFaqs() {
  const { s } = await getStrings();
  return (
    <Section>
      <Container className="max-w-3xl">
        <div className="flex flex-col gap-2">
          <p className="text-[var(--web-font-size-caption)] font-bold uppercase tracking-wide text-[var(--color-primary)]">
            {s.home.faqEyebrow}
          </p>
          <h2 className="text-2xl font-semibold text-[var(--color-text)] md:text-3xl">
            {s.home.faqTitle}
          </h2>
        </div>

        <div className="mt-6">
          <Faqs faqs={HOME_FAQS} />
        </div>
      </Container>
    </Section>
  );
}
