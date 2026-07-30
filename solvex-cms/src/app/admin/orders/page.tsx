import { and, desc, eq, like, or } from 'drizzle-orm';
import { ORDER_STATUSES, getTechnicianOptions, schema, type OrderStatus } from '@solvex/db';
import { db } from '@/lib/cf';
import { requireAdmin } from '@/lib/session';
import { Topbar, PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableWrap, Th, Td, Tr, EmptyRow } from '@/components/ui/table';
import { formatDate, formatTaka } from '@/lib/format';
import { StatusControl } from './status-control';
import { AssignControl } from './assign-control';
import { allowedNext, STATUS_LABEL as LABEL, STATUS_TONE as TONE } from './transitions';

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
      address: schema.orders.addressSnapshot,
      areaName: schema.areas.name,
      scheduledDate: schema.orders.scheduledDate,
      slotLabel: schema.slotTemplates.label,
      total: schema.orders.total,
      creditApplied: schema.orders.creditApplied,
      status: schema.orders.status,
      notes: schema.orders.notes,
      areaId: schema.orders.areaId,
      categoryId: schema.services.categoryId,
      technicianId: schema.orders.technicianId,
      technicianName: schema.technicians.fullName,
      technicianPhone: schema.technicians.phone,
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

  // One lookup per distinct area/category pair rather than per row.
  const optionCache = new Map<string, Awaited<ReturnType<typeof getTechnicianOptions>>>();
  for (const row of rows) {
    const key = `${row.areaId ?? ''}:${row.categoryId ?? ''}`;
    if (!optionCache.has(key)) {
      optionCache.set(
        key,
        await getTechnicianOptions(db(), { areaId: row.areaId, categoryId: row.categoryId }),
      );
    }
  }

  const counts = await db()
    .select({ status: schema.orders.status, n: schema.orders.id })
    .from(schema.orders);
  const byStatus = new Map<OrderStatus, number>();
  for (const row of counts) {
    byStatus.set(row.status, (byStatus.get(row.status) ?? 0) + 1);
  }

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
            className={`inline-flex h-8 items-center gap-2 rounded-[var(--radius-pill)] px-3 text-[13px] ${
              !filter
                ? 'bg-[var(--color-text)] text-white'
                : 'bg-[var(--color-surface)] text-[var(--color-muted)]'
            }`}
          >
            All <span className="font-medium">{counts.length}</span>
          </a>
          {ORDER_STATUSES.map((status) => (
            <a
              key={status}
              href={`/admin/orders?status=${status}${query ? `&q=${encodeURIComponent(query)}` : ''}`}
              className={`inline-flex h-8 items-center gap-2 rounded-[var(--radius-pill)] px-3 text-[13px] ${
                filter === status
                  ? 'bg-[var(--color-text)] text-white'
                  : 'bg-[var(--color-surface)] text-[var(--color-muted)]'
              }`}
            >
              {LABEL[status]} <span className="font-medium">{byStatus.get(status) ?? 0}</span>
            </a>
          ))}
        </div>

        <Card>
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Order</Th>
                  <Th>Customer</Th>
                  <Th>Service</Th>
                  <Th>When</Th>
                  <Th>Total</Th>
                  <Th>Technician</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Move to</Th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && <EmptyRow colSpan={8}>No orders here yet.</EmptyRow>}
                {rows.map((row) => (
                  <Tr key={row.id}>
                    <Td>
                      <code className="text-xs">{row.code}</code>
                      {row.notes && (
                        <div className="mt-1 max-w-[28ch] truncate text-xs text-[var(--color-muted)]">
                          “{row.notes}”
                        </div>
                      )}
                    </Td>
                    <Td>
                      <div className="font-medium">{row.customer}</div>
                      <div className="text-xs text-[var(--color-muted)]">{row.phone}</div>
                      <div className="max-w-[32ch] truncate text-xs text-[var(--color-muted)]">
                        {row.address}
                        {row.areaName ? ` · ${row.areaName}` : ''}
                      </div>
                    </Td>
                    <Td>{row.serviceName}</Td>
                    <Td>
                      <div>{formatDate(row.scheduledDate)}</div>
                      <div className="text-xs text-[var(--color-muted)]">{row.slotLabel}</div>
                    </Td>
                    <Td>
                      <div className="font-medium">{formatTaka(row.total)}</div>
                      {row.creditApplied > 0 && (
                        <div className="text-xs text-[var(--color-muted)]">
                          incl. {formatTaka(row.creditApplied)} credit
                        </div>
                      )}
                    </Td>
                    <Td>
                      <AssignControl
                        orderId={row.id}
                        assignedId={row.technicianId}
                        options={optionCache.get(`${row.areaId ?? ''}:${row.categoryId ?? ''}`) ?? []}
                        closed={row.status === 'COMPLETED' || row.status === 'CANCELLED'}
                      />
                      {row.technicianPhone && (
                        <div className="mt-1 text-right text-xs text-[var(--color-muted)]">
                          {row.technicianPhone}
                        </div>
                      )}
                    </Td>
                    <Td>
                      <Badge tone={TONE[row.status]}>{LABEL[row.status]}</Badge>
                    </Td>
                    <Td className="text-right">
                      <StatusControl
                        orderId={row.id}
                        status={row.status}
                        options={allowedNext(row.status).map((s) => ({ value: s, label: LABEL[s] }))}
                      />
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
