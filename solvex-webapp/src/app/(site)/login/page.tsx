import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthCard } from '@/components/ui/input';
import { getCustomer } from '@/lib/session';
import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Log in' };

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  if (await getCustomer()) redirect('/account');

  const params = await searchParams;
  const next = Array.isArray(params.next) ? params.next[0] : params.next;

  return (
    <AuthCard
      title="Welcome back"
      footer={
        <>
          New to SolveX?{' '}
          <Link href="/signup" className="font-medium text-[var(--color-primary)] hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <LoginForm next={next ?? null} />
    </AuthCard>
  );
}
