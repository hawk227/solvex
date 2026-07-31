import Link from 'next/link';
import { AuthCard } from '@/components/ui/input';
import { ForgotPasswordForm } from './forgot-password-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Reset your password' };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Reset your password"
      subtitle="We email you a code, then you choose a new password."
      footer={
        <Link href="/login" className="font-medium text-[var(--color-primary)] hover:underline">
          Back to log in
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
