import { redirect } from 'next/navigation';
import { getCurrentEmployee } from '@/lib/session';
import { Logo } from '@/components/ui/logo';
import { ChangePasswordForm } from './change-password-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Change password — SolveX Admin' };

export default async function ChangePasswordPage() {
  const employee = await getCurrentEmployee();
  if (!employee) redirect('/login');

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12"
      style={{ background: 'var(--cms-auth-gradient)' }}
    >
      <div className="relative w-full max-w-[26rem]">
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-8 shadow-[var(--shadow-lg)]">
          <div className="flex flex-col items-center">
            <Logo height={34} />
            <h1 className="mt-6 text-2xl font-bold tracking-tight text-[var(--color-text)]">
              {employee.mustChangePassword ? 'Choose your password' : 'Change password'}
            </h1>
            <p className="mt-1 text-center text-[13px] text-[var(--color-muted)]">
              {employee.mustChangePassword
                ? 'Your account uses a temporary password. Pick your own to continue.'
                : `Signed in as ${employee.email}`}
            </p>
          </div>

          <div className="mt-7">
            <ChangePasswordForm forced={employee.mustChangePassword} />
          </div>
        </div>
      </div>
    </main>
  );
}
