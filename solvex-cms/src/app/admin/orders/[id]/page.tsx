import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTechnicianOptions } from '@solvex/db';
import { db } from '@/lib/cf';
import { canManage, requireView } from '@/lib/session';
import { Topbar, PageHeader } from '@/components/layout/page-header';
import { ReadOnlyNotice } from '@/components/ui/read-only-notice';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatDateTime, formatTaka } from '@/lib/format';
import { formatBdMobile } from '@/lib/phone';
import {
  getAdminOrder,
  getAdminOrderEvents,
  getOrderOptionLabels,
} from '@/lib/order-detail';
import { allowedNext, STATUS_LABEL, STATUS_TONE } from '../transitions';
import { StatusControl } from '../status-control';
import { AssignControl } from '../assign-control';

export async function generateMetadata({ params }: PageProps<'/admin/orders/[id]'>) {
  const { id } = await params;
  const order = await getAdminOrder(Number.parseInt(id, 10));
  return { title: order ? `${order.code} — SolveX Admin` : 'Order — SolveX Admin' };
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
        {label}
      </dt>
      <dd className="text-[13px] text-[var(--color-text)]">{children}</dd>
    </div>
  );
}

export default async function OrderDetailPage({ params }: PageProps<'/admin/orders/[id]'>) {
  const employee = await requireView('orders');
  const editable = canManage(employee, 'orders');

  const { id } = await params;
  const orderId = Number.parseInt(id, 10);
  if (Number.isNaN(orderId)) notFound();

  const order = await getAdminOrder(orderId);
  if (!order) notFound();

  const [events, optionLabels, technicianOptions] = await Promise.all([
    getAdminOrderEvents(order.id),
    getOrderOptionLabels(order.comboKey),
    getTechnicianOptions(db(), { areaId: order.areaId, categoryId: order.categoryId }),
  ]);

  const closed = order.status === 'COMPLETED' || order.status === 'CANCELLED';
  const next = allowedNext(order.status);

  return (
    <>
      <Topbar breadcrumb={['Admin', 'Orders', order.code]} />
      <main className="flex-1 p-6">
        <PageHeader
          title={order.code}
          subtitle={
            <>
              <Link href="/admin/orders" className="hover:underline">
                ← All orders
              </Link>
              {' · '}
              {order.serviceName}
              {' · placed '}
              {formatDateTime(order.createdAt)}
            </>
          }
          actions={<Badge tone={STATUS_TONE[order.status]}>{STATUS_LABEL[order.status]}</Badge>}
        />

        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-6">
            {/* Everything that changes the order lives together at the top. */}
            <Card>
              <CardBody>
                <h2 className="text-base font-bold text-[var(--color-text)]">
                  {editable ? 'Manage this order' : 'Order status'}
                </h2>
                {!editable && <ReadOnlyNotice what="orders" className="mt-4" />}

                <div className="mt-5 flex flex-col gap-5">
                  <div>
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                      Status
                    </p>
                    {next.length === 0 ? (
                      <p className="text-[13px] text-[var(--color-muted)]">
                        {order.status === 'COMPLETED'
                          ? 'This job is complete. No further changes.'
                          : 'This order was cancelled. No further changes.'}
                      </p>
                    ) : !editable ? (
                      <p className="text-[13px]">{STATUS_LABEL[order.status]}</p>
                    ) : (
                      <StatusControl
                        orderId={order.id}
                        status={order.status}
                        options={next.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
                      />
                    )}
                  </div>

                  <div className="border-t border-[var(--color-border)] pt-5">
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
                      Technician
                    </p>
                    <AssignControl
                      orderId={order.id}
                      assignedId={order.technicianId}
                      options={technicianOptions}
                      closed={closed || !editable}
                    />
                    {order.technicianName && (
                      <p className="mt-2 text-[13px] text-[var(--color-muted)]">
                        {order.technicianName}
                        {order.technicianPhone && ` · ${formatBdMobile(order.technicianPhone)}`}
                      </p>
                    )}
                    {!closed && technicianOptions.length > 0 && (
                      <p className="mt-2 text-xs text-[var(--color-muted)]">
                        Ordered by best fit. “skilled” means they work on{' '}
                        {order.categoryName}; “local” means they cover{' '}
                        {order.areaName ?? 'this area'}. You can pick anyone.
                      </p>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <h2 className="text-base font-bold text-[var(--color-text)]">Activity</h2>
                <ol className="mt-4 flex flex-col gap-4">
                  {events.map((event, i) => (
                    <li key={i} className="flex gap-3">
                      <span
                        aria-hidden
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-primary)]"
                      />
                      <div>
                        <p className="text-[13px] font-medium text-[var(--color-text)]">
                          {STATUS_LABEL[event.status]}
                        </p>
                        {event.note && (
                          <p className="text-[13px] text-[var(--color-muted)]">{event.note}</p>
                        )}
                        <p className="text-xs text-[var(--color-muted)]">
                          {formatDateTime(event.createdAt)}
                          {event.adminId ? ' · by staff' : ' · by system'}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </CardBody>
            </Card>
          </div>

          <aside className="flex flex-col gap-6">
            <Card>
              <CardBody>
                <h2 className="mb-4 text-base font-bold text-[var(--color-text)]">Appointment</h2>
                <dl className="flex flex-col gap-3">
                  <Row label="Date">{formatDate(order.scheduledDate)}</Row>
                  <Row label="Window">
                    {order.slotLabel}
                    <span className="ml-2 text-[var(--color-muted)]">({order.slotWindow})</span>
                  </Row>
                  <Row label="Service">
                    {order.serviceName}
                    <span className="ml-2 text-[var(--color-muted)]">{order.categoryName}</span>
                  </Row>
                  {optionLabels.length > 0 && (
                    <Row label="Options">
                      <ul className="flex flex-col gap-0.5">
                        {optionLabels.map((label) => (
                          <li key={label}>{label}</li>
                        ))}
                      </ul>
                    </Row>
                  )}
                  {order.notes && <Row label="Customer notes">{order.notes}</Row>}
                </dl>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <h2 className="mb-4 text-base font-bold text-[var(--color-text)]">Customer</h2>
                <dl className="flex flex-col gap-3">
                  <Row label="Name">{order.nameSnapshot}</Row>
                  <Row label="Mobile">
                    <a
                      href={`tel:${order.phoneSnapshot}`}
                      className="text-[var(--color-primary)] hover:underline"
                    >
                      {formatBdMobile(order.phoneSnapshot)}
                    </a>
                  </Row>
                  {order.customerEmail && <Row label="Email">{order.customerEmail}</Row>}
                  <Row label="Address">
                    {order.addressSnapshot}
                    {order.areaName && (
                      <span className="block text-[var(--color-muted)]">{order.areaName}</span>
                    )}
                  </Row>
                </dl>
                <p className="mt-4 text-xs text-[var(--color-muted)]">
                  These details were captured when the order was placed, so they still show where
                  the technician was sent even if the customer edits their profile.
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <h2 className="mb-4 text-base font-bold text-[var(--color-text)]">Payment</h2>
                <dl className="flex flex-col gap-2 text-[13px]">
                  <div className="flex justify-between gap-4">
                    <dt className="text-[var(--color-muted)]">Service</dt>
                    <dd>{formatTaka(order.basePrice)}</dd>
                  </div>
                  {order.creditApplied > 0 && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-[var(--color-muted)]">Referral credit</dt>
                      <dd className="text-[var(--color-success)]">
                        − {formatTaka(order.creditApplied)}
                      </dd>
                    </div>
                  )}
                </dl>
                <div className="mt-4 flex items-baseline justify-between border-t border-[var(--color-border)] pt-4">
                  <span className="text-[13px] font-medium">Collect in cash</span>
                  <span className="text-2xl font-bold">{formatTaka(order.total)}</span>
                </div>
              </CardBody>
            </Card>
          </aside>
        </div>
      </main>
    </>
  );
}
