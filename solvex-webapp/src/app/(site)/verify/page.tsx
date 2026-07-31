import { AuthCard } from '@/components/ui/input';
import { VerifyForm } from './verify-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Confirm your email' };

export default async function VerifyPage({ searchParams }: PageProps<'/verify'>) {
  const params = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  return (
    <AuthCard
      title="Confirm your email"
      subtitle="Enter the 6-digit code we just emailed you. It expires in 10 minutes."
    >
      <VerifyForm email={first(params.email) ?? ''} referralCode={first(params.ref) ?? null} />
    </AuthCard>
  );
}
