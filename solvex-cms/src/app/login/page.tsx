import { redirect } from 'next/navigation';
import { getAdmin } from '@/lib/session';
import { LoginForm } from './login-form';
import { Logo } from '@/components/ui/logo';

export const metadata = { title: 'Sign in — SolveX Admin' };

// Reads the session to redirect an already-signed-in admin, so it cannot be static.
export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if (await getAdmin()) redirect('/admin/dashboard');

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-surface)] p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Logo height={40} />
          {/* The wordmark is in the artwork, so the heading names the surface. */}
          <h1 className="text-[13px] text-[var(--color-muted)]">Back-office</h1>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
