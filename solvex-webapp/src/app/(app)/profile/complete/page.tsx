import { redirect } from 'next/navigation';
import { AuthCard } from '@/components/ui/input';
import { getActiveAreas } from '@/lib/catalog';
import { getProfile, requireCustomer } from '@/lib/session';
import { ProfileForm } from './profile-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Complete your profile' };

export default async function CompleteProfilePage({
  searchParams,
}: PageProps<'/profile/complete'>) {
  const customer = await requireCustomer('/profile/complete');
  const params = await searchParams;
  const next = Array.isArray(params.next) ? params.next[0] : params.next;

  // Verified address is a prerequisite: an unverified account must not be able
  // to reach a booking-capable state.
  if (!customer.emailVerified) {
    redirect(`/verify?email=${encodeURIComponent(customer.email)}`);
  }

  const [areas, profile] = await Promise.all([getActiveAreas(), getProfile(customer.id)]);

  return (
    <AuthCard
      title={profile ? 'Your details' : 'Almost there'}
      subtitle={
        profile
          ? 'Update where and how we reach you.'
          : 'We need these to send a technician to the right place.'
      }
    >
      <ProfileForm
        areas={areas}
        profile={profile}
        next={next ?? null}
        defaultName={customer.name}
      />
    </AuthCard>
  );
}
