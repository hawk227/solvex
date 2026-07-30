import { ProsePage, ProseSection } from '@/components/layout/prose-page';

export const metadata = {
  title: 'Privacy policy',
  description: 'What data SolveX collects, why we collect it, and what we do not do with it.',
};

/*
 * Describes the data this application actually collects, matching the schema.
 * Have a qualified lawyer review before launch.
 */
export default function PrivacyPage() {
  return (
    <ProsePage
      title="Privacy policy"
      intro="What we collect, why we collect it, and what we do not do with it."
      updated="30 July 2026"
    >
      <ProseSection heading="What we collect">
        <ul className="ml-5 list-disc space-y-2">
          <li>
            <strong>Account details:</strong> your email address and a securely hashed password. We
            never store your password itself.
          </li>
          <li>
            <strong>Profile details:</strong> your name, phone number, address and area — needed to
            send a technician to the right place.
          </li>
          <li>
            <strong>Order details:</strong> the service booked, your selections, date and window, and
            the status history of the job.
          </li>
          <li>
            <strong>Referral details:</strong> who referred whom, and your credit balance history.
          </li>
        </ul>
      </ProseSection>

      <ProseSection heading="What we do not collect">
        <p>
          We do not take card or bank details, because payment is in cash to the technician. There is
          no online payment step and nothing to store.
        </p>
      </ProseSection>

      <ProseSection heading="Why your address is copied onto an order">
        <p>
          When you place an order, your name, phone and address are saved onto that order as a
          record of where the visit was for. Editing your profile later changes future bookings but
          does not rewrite past ones, so our records match what actually happened.
        </p>
      </ProseSection>

      <ProseSection heading="Who sees your data">
        <p>
          Our staff use it to run and support your bookings, and the assigned technician receives the
          details needed to reach you and do the job. We do not sell your data or share it for
          advertising.
        </p>
      </ProseSection>

      <ProseSection heading="Where it is stored">
        <p>
          Your data is held in our Cloudflare-hosted database, in the Asia-Pacific region. Uploaded
          images of service categories are public marketing assets and contain no customer data.
        </p>
      </ProseSection>

      <ProseSection heading="Your choices">
        <p>
          You can view and correct your profile from your account at any time. To request a copy of
          your data or ask us to delete your account, contact us — note that we may keep order
          records where we are required to.
        </p>
      </ProseSection>
    </ProsePage>
  );
}
