import Link from 'next/link';
import { and, desc, eq, like, or } from 'drizzle-orm';
import { ORDER_STATUSES, schema, type OrderStatus } from '@solvex/db';
import { db } from '@/lib/cf';
import { requireAdmin } from '@/lib/session';
import { Topbar, PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableWrap, Th, Td, Tr, EmptyRow } from '@/components/ui/table';
import { formatDate, formatTaka } from '@/lib/format';
import { STATUS_LABEL as LABEL, STATUS_TONE as TONE } from './transitions';

export const metadata = { title: 'Orders — SolveX Admin' };

export default async function OrdersPage({ searchParams }: PageProps<'/admin/orders'>) {
  await requireAdmin();

  const params = await searchParams;
  const raw = Array.isArray(params.status) ? params.status[0] : params.status;
  const filter = ORDER_STATUSES.find((s) => s === raw);
  const query = (Array.isArray(params.q) ? params.q[0] : params.q)?.trim() ?? '';

  const base = db()
    .select({
      id: schema.orders.id,
      code: schema.orders.code,
      serviceName: schema.services.name,
      customer: schema.orders.nameSnapshot,
      phone: schema.orders.phoneSnapshot,
      areaName: schema.areas.name,
      scheduledDate: schema.orders.scheduledDate,
      slotLabel: schema.slotTemplates.label,
      total: schema.orders.total,
      status: schema.orders.status,
      technicianName: schema.technicians.fullName,
    })
    .from(schema.orders)
    .innerJoin(schema.services, eq(schema.services.id, schema.orders.serviceId))
    .innerJoin(schema.slotTemplates, eq(schema.slotTemplates.id, schema.orders.slotId))
    .leftJoin(schema.areas, eq(schema.areas.id, schema.orders.areaId))
    .leftJoin(schema.technicians, eq(schema.technicians.id, schema.orders.technicianId));

  const conditions = [];
  if (filter) conditions.push(eq(schema.orders.status, filter));
  if (query) {
    // Escape LIKE wildcards so a typed "%" searches for a literal percent sign
    // rather than matching every order.
    const term = `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    conditions.push(
      or(
        like(schema.orders.code, term),
        like(schema.orders.phoneSnapshot, term),
        like(schema.orders.nameSnapshot, term),
      )!,
    );
  }

  const rows = await (conditions.length > 0 ? base.where(and(...conditions)) : base).orderBy(
    desc(schema.orders.createdAt),
  );

  const counts = await db().select({ status: schema.orders.status }).from(schema.orders);
  const byStatus = new Map<OrderStatus, number>();
  for (const row of counts) byStatus.set(row.status, (byStatus.get(row.status) ?? 0) + 1);

  const chip = (active: boolean) =>
    `inline-flex h-8 items-center gap-2 rounded-[var(--radius-pill)] px-3 text-[13px] ${
      active
        ? 'bg-[var(--color-text)] text-white'
        : 'bg-[var(--color-surface)] text-[var(--color-muted)]'
    }`;

  return (
    <>
      <Topbar breadcrumb={['Admin', 'Orders']} />
      <main className="flex-1 p-6">
        <PageHeader
          title="Orders"
          subtitle={`${rows.length} shown · ${byStatus.get('PENDING') ?? 0} awaiting approval`}
        />

        <form method="get" className="mb-5 flex flex-wrap items-center gap-2">
          {filter && <input type="hidden" name="status" value={filter} />}
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search by order code, phone or name"
            aria-label="Search orders"
            className="h-[var(--cms-input-height)] min-w-64 flex-1 rounded-[var(--cms-control-radius)] border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 text-[13px]"
          />
          <button
            type="submit"
            className="inline-flex h-[var(--cms-control-height)] items-center rounded-[var(--cms-control-radius)] bg-[var(--color-primary)] px-4 text-[13px] font-medium text-[var(--color-primary-foreground)] transition-colors duration-[var(--duration-hover)] hover:bg-[var(--color-primary-hover)]"
          >
            Search
          </button>
          {query && (
            <a
              href={filter ? `/admin/orders?status=${filter}` : '/admin/orders'}
              className="text-[13px] text-[var(--color-muted)] hover:text-[var(--color-text)]"
            >
              Clear
            </a>
          )}
        </form>

        <div className="mb-5 flex flex-wrap items-center gap-2">
          <a
            href={query ? `/admin/orders?q=${encodeURIComponent(query)}` : '/admin/orders'}
            className={chip(!filter)}
          >
            All <span className="font-medium">{counts.length}</span>
          </a>
          {ORDER_STATUSES.map((status) => (
            <a
              key={status}
              href={`/admin/orders?status=${status}${query ? `&q=${encodeURIComponent(query)}` : ''}`}
              className={chip(filter === status)}
            >
              {LABEL[status]} <span className="font-medium">{byStatus.get(status) ?? 0}</span>
            </a>
          ))}
        </div>

        {/*
          The list is for scanning and finding. Everything that changes an order
          happens on its own page — a status control, technician picker and note
          field in every row made the table unreadable.
        */}
        <Card>
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Order</Th>
                  <Th>Customer</Th>
                  <Th>Service</Th>
                  <Th>Scheduled</Th>
                  <Th>Technician</Th>
                  <Th className="text-right">Total</Th>
                  <Th>Status</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && <EmptyRow colSpan={8}>No orders here yet.</EmptyRow>}
                {rows.map((row) => (
                  <Tr key={row.id} className="hover:bg-[var(--color-surface)]">
                    <Td>
                      <Link
                        href={`/admin/orders/${row.id}`}
                        className="whitespace-nowrap font-medium hover:text-[var(--color-primary)] hover:underline"
                      >
                        {row.code}
                      </Link>
                    </Td>
                    <Td>
                      <div className="font-medium">{row.customer}</div>
                      <div className="whitespace-nowrap text-xs text-[var(--color-muted)]">
                        {row.phone}
                      </div>
                    </Td>
                    <Td>
                      <div>{row.serviceName}</div>
                      {row.areaName && (
                        <div className="text-xs text-[var(--color-muted)]">{row.areaName}</div>
                      )}
                    </Td>
                    <Td>
                      <div className="whitespace-nowrap">{formatDate(row.scheduledDate)}</div>
                      <div className="whitespace-nowrap text-xs text-[var(--color-muted)]">
                        {row.slotLabel}
                      </div>
                    </Td>
                    <Td>
                      {row.technicianName ? (
                        <span className="whitespace-nowrap">{row.technicianName}</span>
                      ) : (
                        <span className="whitespace-nowrap text-xs text-[var(--color-muted)]">
                          Unassigned
                        </span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-right font-medium">
                      {formatTaka(row.total)}
                    </Td>
                    <Td>
                      <Badge tone={TONE[row.status]} className="whitespace-nowrap">
                        {LABEL[row.status]}
                      </Badge>
                    </Td>
                    <Td className="text-right">
                      <Link
                        href={`/admin/orders/${row.id}`}
                        className="whitespace-nowrap text-[13px] text-[var(--color-primary)] hover:underline"
                      >
                        Manage →
                      </Link>
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
