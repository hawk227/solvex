import { redirect } from 'next/navigation';
import { getAdmin } from '@/lib/session';
import { Logo } from '@/components/ui/logo';
import { LoginForm } from './login-form';
import { PoweredBy } from '@/components/layout/powered-by';

export const metadata = { title: 'Sign in — SolveX Admin' };

// Reads the session to redirect an already-signed-in admin, so it cannot be static.
export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if (await getAdmin()) redirect('/admin/dashboard');

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
              Welcome back
            </h1>
            <p className="mt-1 text-center text-[13px] text-[var(--color-muted)]">
              Sign in to the SolveX back-office
            </p>
          </div>

          <div className="mt-7">
            <LoginForm />
          </div>
        </div>

        {/* White at 80% rather than the muted grey token: this sits on the dark
            end of the gradient, where grey-on-navy fails contrast. */}
        <p className="mt-6 text-center text-xs text-white/80">
          Staff access only. Accounts are created by an existing administrator.
        </p>

        <div className="mt-8 flex justify-center">
          <PoweredBy />
        </div>
      </div>
    </main>
  );
}
