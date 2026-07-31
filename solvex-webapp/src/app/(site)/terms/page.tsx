import { ProsePage, ProseSection } from '@/components/layout/prose-page';

export const metadata = {
  title: 'Terms & conditions',
  description: 'The terms that apply when you book a service through SolveX.',
};

/*
 * Plain-language description of how the service actually works, matching the
 * behaviour that is implemented. It is NOT a lawyer-reviewed contract — have a
 * qualified lawyer review this before launch.
 */
export default function TermsPage() {
  return (
    <ProsePage
      title="Terms & conditions"
      intro="These terms describe what you can expect from SolveX and what we expect from you."
      updated="30 July 2026"
    >
      <ProseSection heading="Booking a service">
        <p>
          When you place an order you are requesting a service in a stated window, not buying a
          guaranteed arrival time. We confirm each order before a technician is assigned, and you can
          follow its status from your account.
        </p>
      </ProseSection>

      <ProseSection heading="Prices and payment">
        <p>
          The price shown for your selected appliance specification is the price for that service.
          Payment is in cash to the technician after the work is complete. Nothing is charged online
          and we do not store card details.
        </p>
        <p>
          Work outside what the service page lists as included — replacement parts, refrigerant, or
          additional units — is not covered by the shown price and will be agreed with you before it
          is carried out.
        </p>
      </ProseSection>

      <ProseSection heading="Access and safety">
        <p>
          Someone aged 18 or over must be present to give the technician access for the duration of
          the visit. If nobody is available when the technician arrives within the booked window, the
          visit may be treated as cancelled.
        </p>
      </ProseSection>

      <ProseSection heading="Cancellation">
        <p>
          You can cancel an order from your account before the technician is on the way, at no cost.
          A cancelled order does not earn referral credit.
        </p>
      </ProseSection>

      <ProseSection heading="Referral credit">
        <p>
          Referral credit is earned when a referred customer&apos;s first order is completed. Credit
          reduces the amount payable on a future order. It has no cash value, cannot be withdrawn or
          transferred, and may be withdrawn if we find it was obtained through duplicate or fake
          accounts.
        </p>
      </ProseSection>

      <ProseSection heading="Service areas">
        <p>
          We serve the areas listed at booking. If your address turns out to be outside our coverage,
          we will contact you and cancel the order without charge.
        </p>
      </ProseSection>

      <ProseSection heading="Changes to these terms">
        <p>
          We may update these terms. The date above shows when they last changed, and the terms in
          force when you placed an order are the ones that apply to it.
        </p>
      </ProseSection>
    </ProsePage>
  );
}
