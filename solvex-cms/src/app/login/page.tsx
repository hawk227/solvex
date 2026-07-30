import { redirect } from 'next/navigation';
import { getAdmin } from '@/lib/session';
import { Logo } from '@/components/ui/logo';
import { LoginForm } from './login-form';

export const metadata = { title: 'Sign in — SolveX Admin' };

// Reads the session to redirect an already-signed-in admin, so it cannot be static.
export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if (await getAdmin()) redirect('/admin/dashboard');

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--color-background)] px-4 py-12">
      {/*
        Soft brand glow behind the card. Purely decorative, so aria-hidden, and
        built from the brand tint token rather than a new colour.
      */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[42rem] w-[42rem] -translate-x-[55%] -translate-y-1/2 rounded-full bg-[var(--color-primary-tint)] opacity-40 blur-[120px]" />
        <div className="absolute left-1/2 top-1/2 h-[30rem] w-[38rem] -translate-x-[35%] -translate-y-[35%] rounded-full bg-[var(--color-primary)] opacity-15 blur-[130px]" />
      </div>

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

        <p className="mt-6 text-center text-xs text-[var(--color-muted)]">
          Staff access only. Accounts are created by an existing administrator.
        </p>
      </div>
    </main>
  );
}
