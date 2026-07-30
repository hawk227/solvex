import Link from 'next/link';
import {
  getAreaUsage,
  getCategoryBreakdown,
  getCustomerGrowth,
  getKpis,
  getOrdersByDay,
  getServiceBreakdown,
  getSlotUsage,
} from '@solvex/db';
import { db } from '@/lib/cf';
import { requireView } from '@/lib/session';
import { Topbar, PageHeader } from '@/components/layout/page-header';
import { Card, CardBody } from '@/components/ui/card';
import { BarList, ColumnChart } from '@/components/ui/bar-chart';
import { formatTaka } from '@/lib/format';

export const metadata = { title: 'Dashboard — SolveX Admin' };

/** Short day label for a YYYY-MM-DD Dhaka date. */
function dayLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
    timeZone: 'UTC',
    day: '2-digit',
  });
}

function fullDayLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'short',
  });
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardBody>
        <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
          {label}
        </p>
        <p className="mt-3 text-3xl font-bold text-[var(--color-text)]">{value}</p>
        {hint && <p className="mt-1 text-xs text-[var(--color-muted)]">{hint}</p>}
      </CardBody>
    </Card>
  );
}

export default async function DashboardPage() {
  await requireView('analytics');
  const d = db();

  const [kpis, daily, services, categories, slots, areas, growth] = await Promise.all([
    getKpis(d),
    getOrdersByDay(d, 14),
    getServiceBreakdown(d, 6),
    getCategoryBreakdown(d),
    getSlotUsage(d),
    getAreaUsage(d, 6),
    getCustomerGrowth(d, 14),
  ]);

  const completionRate =
    kpis.ordersTotal === 0
      ? 0
      : Math.round((kpis.ordersCompleted / kpis.ordersTotal) * 100);

  return (
    <>
      <Topbar breadcrumb={['Admin', 'Dashboard']} />
      <main className="flex-1 p-6">
        <PageHeader
          title="Dashboard"
          subtitle="Revenue counts completed work only. Days are Asia/Dhaka."
        />

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label="Revenue"
            value={formatTaka(kpis.revenue)}
            hint={`from ${kpis.ordersCompleted} completed ${kpis.ordersCompleted === 1 ? 'job' : 'jobs'}`}
          />
          <Stat
            label="Average job"
            value={formatTaka(kpis.averageOrderValue)}
            hint="completed orders only"
          />
          <Stat
            label="Awaiting approval"
            value={String(kpis.ordersPending)}
            hint={kpis.ordersPending > 0 ? 'needs attention' : 'all clear'}
          />
          <Stat
            label="Customers"
            value={String(kpis.customers)}
            hint="profiles completed"
          />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardBody>
              <div className="mb-4 flex items-baseline justify-between gap-4">
                <h2 className="text-base font-bold text-[var(--color-text)]">
                  Bookings, last 14 days
                </h2>
                <Link
                  href="/admin/orders"
                  className="text-[13px] text-[var(--color-primary)] hover:underline"
                >
                  All orders
                </Link>
              </div>
              <ColumnChart
                points={daily.map((p) => ({
                  label: dayLabel(p.date),
                  value: p.orders,
                  title: fullDayLabel(p.date),
                }))}
              />
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h2 className="mb-1 text-base font-bold text-[var(--color-text)]">Order health</h2>
              <p className="mb-4 text-xs text-[var(--color-muted)]">
                {completionRate}% of all orders completed
              </p>
              <BarList
                bars={[
                  { label: 'Completed', value: kpis.ordersCompleted },
                  { label: 'Pending', value: kpis.ordersPending },
                  { label: 'Cancelled', value: kpis.ordersCancelled },
                ]}
              />
              <div className="mt-5 border-t border-[var(--color-border)] pt-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                  Credit redeemed
                </p>
                <p className="mt-1 text-lg font-bold">{formatTaka(kpis.creditRedeemed)}</p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  Referral credit taken off completed jobs — not collected in cash.
                </p>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <Card>
            <CardBody>
              <h2 className="mb-4 text-base font-bold text-[var(--color-text)]">Top services</h2>
              <BarList
                bars={services.map((s) => ({
                  label: s.name,
                  value: s.orders,
                  sublabel: `· ${formatTaka(s.revenue)}`,
                }))}
                emptyMessage="No bookings yet."
              />
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h2 className="mb-4 text-base font-bold text-[var(--color-text)]">By category</h2>
              <BarList
                bars={categories.map((c) => ({
                  label: c.name,
                  value: c.orders,
                  sublabel: `· ${formatTaka(c.revenue)}`,
                }))}
                emptyMessage="No bookings yet."
              />
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h2 className="mb-4 text-base font-bold text-[var(--color-text)]">
                Time window demand
              </h2>
              <BarList bars={slots.map((s) => ({ label: s.label, value: s.orders }))} />
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h2 className="mb-4 text-base font-bold text-[var(--color-text)]">Busiest areas</h2>
              <BarList
                bars={areas.map((a) => ({ label: a.name, value: a.orders }))}
                emptyMessage="No bookings yet."
              />
            </CardBody>
          </Card>
        </div>

        <Card className="mt-6">
          <CardBody>
            <h2 className="mb-4 text-base font-bold text-[var(--color-text)]">
              New customers, last 14 days
            </h2>
            <ColumnChart
              points={growth.map((p) => ({
                label: dayLabel(p.date),
                value: p.signups,
                title: fullDayLabel(p.date),
              }))}
            />
          </CardBody>
        </Card>
      </main>
    </>
  );
}
