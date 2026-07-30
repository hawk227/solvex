import Link from 'next/link';
import { desc, eq, like, or, sql } from 'drizzle-orm';
import { schema } from '@solvex/db';
import { db } from '@/lib/cf';
import { requireAdmin } from '@/lib/session';
import { Topbar, PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableWrap, Th, Td, Tr, EmptyRow } from '@/components/ui/table';
import { formatDate, formatTaka } from '@/lib/format';

export const metadata = { title: 'Customers — SolveX Admin' };

/*
 * Every column below is written table-qualified as literal SQL text.
 * Interpolating a Drizzle column into a raw `sql` template emits it
 * unqualified, which resolves against the wrong table inside a subquery and
 * returns a plausible wrong number. See packages/db/src/aggregates.ts.
 */
const ORDERS_TOTAL = sql<number>`(
  SELECT count(*) FROM orders WHERE orders.user_id = profiles.user_id
)`;

const ORDERS_COMPLETED = sql<number>`(
  SELECT count(*) FROM orders
  WHERE orders.user_id = profiles.user_id AND orders.status = 'COMPLETED'
)`;

/** Cash actually collected: completed orders only. */
const LIFETIME_SPEND = sql<number>`(
  SELECT COALESCE(SUM(orders.total), 0) FROM orders
  WHERE orders.user_id = profiles.user_id AND orders.status = 'COMPLETED'
)`;

const CREDIT_BALANCE = sql<number>`(
  SELECT COALESCE(SUM(credit_ledger.delta), 0) FROM credit_ledger
  WHERE credit_ledger.user_id = profiles.user_id
)`;

const REFERRED_COUNT = sql<number>`(
  SELECT count(*) FROM referrals WHERE referrals.referrer_user_id = profiles.user_id
)`;

export default async function CustomersPage({ searchParams }: PageProps<'/admin/customers'>) {
  await requireAdmin();

  const params = await searchParams;
  const query = (Array.isArray(params.q) ? params.q[0] : params.q)?.trim() ?? '';

  const base = db()
    .select({
      userId: schema.profiles.userId,
      fullName: schema.profiles.fullName,
      phone: schema.profiles.phone,
      address: schema.profiles.address,
      referralCode: schema.profiles.referralCode,
      createdAt: schema.profiles.createdAt,
      email: schema.user.email,
      emailVerified: schema.user.emailVerified,
      areaName: schema.areas.name,
      ordersTotal: ORDERS_TOTAL,
      ordersCompleted: ORDERS_COMPLETED,
      lifetimeSpend: LIFETIME_SPEND,
      creditBalance: CREDIT_BALANCE,
      referredCount: REFERRED_COUNT,
    })
    .from(schema.profiles)
    .innerJoin(schema.user, eq(schema.user.id, schema.profiles.userId))
    .leftJoin(schema.areas, eq(schema.areas.id, schema.profiles.areaId));

  const rows = await (
    query
      ? base.where(
          or(
            like(schema.profiles.fullName, `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`),
            like(schema.profiles.phone, `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`),
            like(schema.user.email, `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`),
          )!,
        )
      : base
  ).orderBy(desc(schema.profiles.createdAt));

  const totalSpend = rows.reduce((sum, r) => sum + Number(r.lifetimeSpend), 0);

  return (
    <>
      <Topbar breadcrumb={['Admin', 'Customers']} />
      <main className="flex-1 p-6">
        <PageHeader
          title="Customers"
          subtitle={`${rows.length} with a completed profile · ${formatTaka(totalSpend)} collected`}
        />

        <Card className="mb-5">
          <form method="get" className="flex flex-wrap items-center gap-2 p-4">
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search by name, phone or email"
              aria-label="Search customers"
              className="h-[var(--cms-input-height)] flex-1 rounded-[var(--cms-control-radius)] border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 text-[13px]"
            />
            <button
              type="submit"
              className="inline-flex h-[var(--cms-control-height)] items-center rounded-[var(--cms-control-radius)] bg-[var(--color-primary)] px-4 text-[13px] font-medium text-[var(--color-primary-foreground)] transition-colors duration-[var(--duration-hover)] hover:bg-[var(--color-primary-hover)]"
            >
              Search
            </button>
            {query && (
              <Link
                href="/admin/customers"
                className="text-[13px] text-[var(--color-muted)] hover:text-[var(--color-text)]"
              >
                Clear
              </Link>
            )}
          </form>
        </Card>

        <Card>
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Customer</Th>
                  <Th>Contact</Th>
                  <Th>Area</Th>
                  <Th>Orders</Th>
                  <Th>Collected</Th>
                  <Th>Credit</Th>
                  <Th>Referrals</Th>
                  <Th>Joined</Th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <EmptyRow colSpan={8}>
                    {query
                      ? 'No customer matches that search.'
                      : 'No customers yet. A customer appears here once they complete their profile.'}
                  </EmptyRow>
                )}
                {rows.map((row) => (
                  <Tr key={row.userId}>
                    <Td>
                      <div className="font-medium">{row.fullName}</div>
                      {!row.emailVerified && (
                        <Badge tone="warning" className="mt-1">
                          Email unverified
                        </Badge>
                      )}
                    </Td>
                    <Td>
                      <div className="text-xs">{row.phone}</div>
                      <div className="max-w-[26ch] truncate text-xs text-[var(--color-muted)]">
                        {row.email}
                      </div>
                    </Td>
                    <Td>
                      <div>{row.areaName ?? '—'}</div>
                      <div className="max-w-[28ch] truncate text-xs text-[var(--color-muted)]">
                        {row.address}
                      </div>
                    </Td>
                    <Td>
                      <Link
                        href={`/admin/orders?q=${encodeURIComponent(row.phone)}`}
                        className="text-[var(--color-primary)] hover:underline"
                      >
                        {Number(row.ordersTotal)}
                      </Link>
                      <div className="text-xs text-[var(--color-muted)]">
                        {Number(row.ordersCompleted)} completed
                      </div>
                    </Td>
                    <Td className="font-medium">{formatTaka(Number(row.lifetimeSpend))}</Td>
                    <Td>
                      {Number(row.creditBalance) > 0 ? (
                        <span className="text-[var(--color-success)]">
                          {formatTaka(Number(row.creditBalance))}
                        </span>
                      ) : (
                        <span className="text-[var(--color-muted)]">—</span>
                      )}
                    </Td>
                    <Td>
                      <div>{Number(row.referredCount)}</div>
                      <code className="text-xs text-[var(--color-muted)]">{row.referralCode}</code>
                    </Td>
                    <Td className="whitespace-nowrap text-xs text-[var(--color-muted)]">
                      {formatDate(row.createdAt.toISOString().slice(0, 10))}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        </Card>
      </main>
    </>
  );
}
