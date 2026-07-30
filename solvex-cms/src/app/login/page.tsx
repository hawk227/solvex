import { redirect } from 'next/navigation';
import { getAdmin } from '@/lib/session';
import { LoginForm } from './login-form';

export const metadata = { title: 'Sign in — SolveX Admin' };

// Reads the session to redirect an already-signed-in admin, so it cannot be static.
export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if (await getAdmin()) redirect('/admin/dashboard');

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-surface)] p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-primary)] text-xl font-bold text-[var(--color-primary-foreground)]">
            S
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-[var(--color-text)]">SolveX</h1>
            <p className="text-[13px] text-[var(--color-muted)]">Back-office</p>
          </div>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
