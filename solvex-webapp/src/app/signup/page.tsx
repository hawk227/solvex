import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthCard } from '@/components/ui/input';
import { getCustomer } from '@/lib/session';
import { SignupForm } from './signup-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Create an account' };

export default async function SignupPage({ searchParams }: PageProps<'/signup'>) {
  if (await getCustomer()) redirect('/account');

  const params = await searchParams;
  const ref = Array.isArray(params.ref) ? params.ref[0] : params.ref;

  return (
    <AuthCard
      title="Create your account"
      subtitle="We email you a 6-digit code to confirm your address."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-[var(--color-primary)] hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <SignupForm referralCode={ref ?? null} />
    </AuthCard>
  );
}
