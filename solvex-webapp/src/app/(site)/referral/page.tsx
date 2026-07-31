import Link from 'next/link';
import { ProsePage, ProseSection } from '@/components/layout/prose-page';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Refer & earn',
  description:
    'Share your SolveX referral code. When your friend’s first booking is completed, your account is credited towards your next service.',
};

export default function ReferralPage() {
  return (
    <ProsePage
      title="Refer a friend, both get credit"
      intro="Share your code. When their first booking is completed, credit lands in your account and comes off your next service."
    >
      <ProseSection heading="How it works">
        <ol className="ml-5 list-decimal space-y-2">
          <li>Create a SolveX account and open your referral page to get your code.</li>
          <li>Share the code with a friend who has not booked with us before.</li>
          <li>They enter it when they sign up.</li>
          <li>
            Once their <strong>first booking is completed</strong>, your account is credited.
          </li>
        </ol>
      </ProseSection>

      <ProseSection heading="Using your credit">
        <p>
          Credit is applied at checkout and comes off the amount the technician collects. If your
          credit is larger than the job, the remainder stays on your account for next time — it is
          never lost and never paid out as cash.
        </p>
      </ProseSection>

      <ProseSection heading="The rules">
        <ul className="ml-5 list-disc space-y-2">
          <li>A customer can only be referred once, by one person.</li>
          <li>You cannot refer yourself.</li>
          <li>Credit is earned on the referee&apos;s first completed order, not on signup.</li>
          <li>A cancelled order does not earn credit.</li>
          <li>Credit reduces a bill; it is not withdrawable.</li>
        </ul>
      </ProseSection>

      <div>
        <Button asChild size="lg">
          <Link href="/signup">Create an account</Link>
        </Button>
      </div>
    </ProsePage>
  );
}
