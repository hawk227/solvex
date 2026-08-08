import Link from 'next/link';
import { eq } from 'drizzle-orm';
import {
  schema,
  getGeography,
  getBookingCatalog,
  getAvailability,
  getCreditBalance,
  normaliseBdMobile,
  findProfileByPhone,
} from '@solvex/db';
import { db } from '@/lib/cf';
import { canManage, requireView } from '@/lib/session';
import { Topbar, PageHeader } from '@/components/layout/page-header';
import { Card, CardBody } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ReadOnlyNotice } from '@/components/ui/read-only-notice';
import { NewCustomerForm } from './new-customer-form';
import { BookingForm } from './booking-form';

export const metadata = { title: 'New order — SolveX Admin' };

function todayDhaka(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
}

function Shell({ subtitle, children }: { subtitle?: string; children: React.ReactNode }) {
  return (
    <>
      <Topbar breadcrumb={['Admin', 'Orders', 'New order']} />
      <main className="flex-1 p-6">
        <PageHeader title="New order" subtitle={subtitle} />
        <Card>
          <CardBody>{children}</CardBody>
        </Card>
      </main>
    </>
  );
}

export default async function NewOrderPage({ searchParams }: PageProps<'/admin/orders/new'>) {
  const employee = await requireView('orders');
  const sp = await searchParams;
  const phoneParam = (Array.isArray(sp.phone) ? sp.phone[0] : sp.phone) ?? '';
  const userIdParam = Array.isArray(sp.userId) ? sp.userId[0] : sp.userId;
  const d = db();

  if (userIdParam) {
    const [profile] = await d
      .select({ fullName: schema.profiles.fullName })
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, userIdParam))
      .limit(1);

    if (!profile) {
      return (
        <Shell>
          <p className="text-[13px] text-[var(--color-muted)]">
            That customer no longer exists.{' '}
            <Link href="/admin/orders/new" className="text-[var(--color-primary)] hover:underline">
              Start over
            </Link>
            .
          </p>
        </Shell>
      );
    }

    const today = todayDhaka();
    const [catalog, availability, creditBalance] = await Promise.all([
      getBookingCatalog(d),
      getAvailability(d, today),
      getCreditBalance(d, userIdParam),
    ]);

    return (
      <Shell subtitle={profile.fullName}>
        {canManage(employee, 'orders') ? (
          <BookingForm
            userId={userIdParam}
            catalog={catalog}
            creditBalance={creditBalance}
            initialAvailability={availability}
            initialDate={today}
          />
        ) : (
          <ReadOnlyNotice what="orders" />
        )}
      </Shell>
    );
  }

  if (phoneParam) {
    const normalized = normaliseBdMobile(phoneParam);

    if (normalized) {
      const match = await findProfileByPhone(d, normalized);
      if (match) {
        return (
          <Shell>
            <div className="flex flex-col gap-4">
              <p className="text-[13px] text-[var(--color-text)]">
                Found an existing customer: <strong>{match.fullName}</strong>
              </p>
              <div className="flex gap-2">
                <Button asChild>
                  <Link href={`/admin/orders/new?userId=${match.userId}`}>Continue</Link>
                </Button>
                <Button variant="secondary" asChild>
                  <Link href="/admin/orders/new">Search again</Link>
                </Button>
              </div>
            </div>
          </Shell>
        );
      }

      const geography = await getGeography(d);
      return (
        <Shell subtitle="No customer found for that number — create one.">
          {canManage(employee, 'customers') ? (
            <NewCustomerForm phone={normalized} geography={geography} />
          ) : (
            <ReadOnlyNotice what="customers" />
          )}
        </Shell>
      );
    }
  }

  return (
    <Shell>
      <form method="get" className="flex flex-col gap-4">
        <Field
          label="Customer phone number"
          htmlFor="phone"
          error={phoneParam ? 'Enter a valid Bangladeshi mobile number.' : undefined}
        >
          <Input id="phone" name="phone" type="tel" required placeholder="01712345678" defaultValue={phoneParam} />
        </Field>
        <div className="flex justify-end">
          <Button type="submit">Find customer</Button>
        </div>
      </form>
    </Shell>
  );
}
