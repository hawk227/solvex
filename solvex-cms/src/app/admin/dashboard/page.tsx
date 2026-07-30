import { count, eq, sum } from 'drizzle-orm';
import { schema } from '@solvex/db';
import { db } from '@/lib/cf';
import { requireAdmin } from '@/lib/session';
import { Topbar, PageHeader } from '@/components/layout/page-header';
import { Card, CardBody } from '@/components/ui/card';
import { formatTaka } from '@/lib/format';

export const metadata = { title: 'Dashboard — SolveX Admin' };

async function stats() {
  const d = db();
  const [orders, pending, completed, services, customers, revenue] = await Promise.all([
    d.select({ n: count() }).from(schema.orders),
    d.select({ n: count() }).from(schema.orders).where(eq(schema.orders.status, 'PENDING')),
    d.select({ n: count() }).from(schema.orders).where(eq(schema.orders.status, 'COMPLETED')),
    d.select({ n: count() }).from(schema.services).where(eq(schema.services.active, true)),
    d.select({ n: count() }).from(schema.profiles),
    d
      .select({ total: sum(schema.orders.total) })
      .from(schema.orders)
      .where(eq(schema.orders.status, 'COMPLETED')),
  ]);

  return {
    orders: orders[0]?.n ?? 0,
    pending: pending[0]?.n ?? 0,
    completed: completed[0]?.n ?? 0,
    services: services[0]?.n ?? 0,
    customers: customers[0]?.n ?? 0,
    revenue: Number(revenue[0]?.total ?? 0),
  };
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardBody>
        <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
          {label}
        </p>
        <p className="mt-3 text-3xl font-bold text-[var(--color-text)]">{value}</p>
      </CardBody>
    </Card>
  );
}

export default async function DashboardPage() {
  await requireAdmin();
  const s = await stats();

  return (
    <>
      <Topbar breadcrumb={['Admin', 'Dashboard']} />
      <main className="flex-1 p-6">
        <PageHeader title="Dashboard" subtitle="Overview of SolveX operations" />

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          <Stat label="Total orders" value={String(s.orders)} />
          <Stat label="Awaiting approval" value={String(s.pending)} />
          <Stat label="Completed" value={String(s.completed)} />
          <Stat label="Revenue (completed)" value={formatTaka(s.revenue)} />
          <Stat label="Active services" value={String(s.services)} />
          <Stat label="Customers" value={String(s.customers)} />
        </div>
      </main>
    </>
  );
}
