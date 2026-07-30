import { desc, eq, sql } from 'drizzle-orm';
import { schema } from '@solvex/db';
import { db } from '@/lib/cf';
import { requireView } from '@/lib/session';
import { Topbar, PageHeader } from '@/components/layout/page-header';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableWrap, Th, Td, Tr, EmptyRow } from '@/components/ui/table';
import { formatTaka } from '@/lib/format';

export const metadata = { title: 'Referrals — SolveX Admin' };

export default async function ReferralsPage() {
  await requireView('referrals');
  const d = db();

  // Table-qualified SQL text rather than interpolated Drizzle columns — see the
  // comment in packages/db/src/aggregates.ts for why that distinction matters.
  const referrerName = sql<string | null>`(
    SELECT profiles.full_name FROM profiles WHERE profiles.user_id = referrals.referrer_user_id
  )`;
  const refereeName = sql<string | null>`(
    SELECT profiles.full_name FROM profiles WHERE profiles.user_id = referrals.referee_user_id
  )`;

  const [rows, rewardSetting, issued] = await Promise.all([
    d
      .select({
        id: schema.referrals.id,
        status: schema.referrals.status,
        orderCode: schema.orders.code,
        referrerName,
        refereeName,
      })
      .from(schema.referrals)
      .leftJoin(schema.orders, eq(schema.orders.id, schema.referrals.orderId))
      .orderBy(desc(schema.referrals.createdAt)),
    d
      .select({ value: schema.settings.value })
      .from(schema.settings)
      .where(eq(schema.settings.key, 'referral_reward_taka')),
    d
      .select({ total: sql<number>`coalesce(sum(credit_ledger.delta), 0)` })
      .from(schema.creditLedger)
      .where(eq(schema.creditLedger.reason, 'REFERRAL_REWARD')),
  ]);

  const rewarded = rows.filter((r) => r.status === 'REWARDED').length;
  const reward = Number.parseInt(rewardSetting[0]?.value ?? '0', 10) || 0;

  return (
    <>
      <Topbar breadcrumb={['Admin', 'Referrals']} />
      <main className="flex-1 p-6">
        <PageHeader
          title="Referrals"
          subtitle={`${rows.length} tracked · ${rewarded} rewarded · reward set to ${formatTaka(reward)}`}
        />

        <div className="mb-6 grid gap-6 sm:grid-cols-3">
          <Card>
            <CardBody>
              <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                Signups referred
              </p>
              <p className="mt-3 text-3xl font-bold">{rows.length}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                Rewards paid
              </p>
              <p className="mt-3 text-3xl font-bold">{rewarded}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                Credit issued
              </p>
              <p className="mt-3 text-3xl font-bold">{formatTaka(Number(issued[0]?.total ?? 0))}</p>
            </CardBody>
          </Card>
        </div>

        <Card>
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Referrer</Th>
                  <Th>Referred customer</Th>
                  <Th>Status</Th>
                  <Th>Qualifying order</Th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <EmptyRow colSpan={4}>
                    No referrals yet. Customers share the code from their account page.
                  </EmptyRow>
                )}
                {rows.map((row) => (
                  <Tr key={row.id}>
                    <Td className="font-medium">{row.referrerName ?? '—'}</Td>
                    <Td>{row.refereeName ?? 'Profile not completed'}</Td>
                    <Td>
                      <Badge
                        tone={
                          row.status === 'REWARDED'
                            ? 'success'
                            : row.status === 'VOID'
                              ? 'danger'
                              : 'warning'
                        }
                      >
                        {row.status === 'REWARDED'
                          ? 'Rewarded'
                          : row.status === 'VOID'
                            ? 'Void'
                            : 'Awaiting first job'}
                      </Badge>
                    </Td>
                    <Td>
                      {row.orderCode ? (
                        <code className="text-xs">{row.orderCode}</code>
                      ) : (
                        <span className="text-[var(--color-muted)]">—</span>
                      )}
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
