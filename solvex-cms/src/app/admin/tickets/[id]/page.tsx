import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Lock } from 'lucide-react';
import { getStaffTicketMessages } from '@solvex/db';
import { db } from '@/lib/cf';
import { canManage, requireView } from '@/lib/session';
import { Topbar, PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/format';
import {
  TICKET_STATUS_LABEL,
  TICKET_STATUS_TONE,
  TOPIC_LABEL,
  getTicket,
} from '@/lib/ticket-queries';
import { ReplyBox } from './reply-box';
import { StatusControl } from './status-control';

export const metadata = { title: 'Ticket — SolveX Admin' };

export default async function TicketPage({ params }: PageProps<'/admin/tickets/[id]'>) {
  const employee = await requireView('tickets');
  const { id } = await params;

  const ticketId = Number(id);
  if (!Number.isInteger(ticketId)) notFound();

  const ticket = await getTicket(ticketId);
  if (!ticket) notFound();

  const messages = await getStaffTicketMessages(db(), ticketId);
  const editable = canManage(employee, 'tickets');

  return (
    <>
      <Topbar breadcrumb={['Admin', 'Tickets', ticket.ref]} />
      <main className="flex-1 p-6">
        <Link
          href="/admin/tickets"
          className="text-[13px] text-[var(--color-muted)] hover:text-[var(--color-text)]"
        >
          ← All tickets
        </Link>

        <PageHeader
          title={ticket.subject}
          subtitle={`${ticket.ref} · ${TOPIC_LABEL[ticket.topic] ?? ticket.topic} · opened ${formatDateTime(ticket.createdAt)}`}
        />

        <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
          <div className="flex flex-col gap-5">
            <Card>
              <ul className="flex flex-col divide-y divide-[var(--color-border)]">
                {messages.map((message) => (
                  <li
                    key={message.id}
                    className={message.internal ? 'bg-[var(--color-warning)]/5 p-4' : 'p-4'}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-[13px] font-medium text-[var(--color-text)]">
                        {message.authorName}
                        <span className="ml-2 text-xs font-normal text-[var(--color-muted)]">
                          {message.authorType === 'CUSTOMER' ? 'Customer' : 'Staff'}
                        </span>
                        {message.internal && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-[var(--radius-pill)] bg-[var(--color-warning)] px-2 py-0.5 text-[11px] font-semibold text-white">
                            <Lock aria-hidden className="h-3 w-3" />
                            Internal
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-[var(--color-muted)]">
                        {formatDateTime(message.createdAt)}
                      </p>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-[13px] text-[var(--color-text)]">
                      {message.body}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>

            {editable ? (
              <ReplyBox ticketId={ticket.id} closed={ticket.status === 'CLOSED'} />
            ) : (
              <p className="text-[13px] text-[var(--color-muted)]">
                You have read-only access to tickets.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-5">
            <Card className="flex flex-col gap-4 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--color-muted)]">Current</span>
                <Badge tone={TICKET_STATUS_TONE[ticket.status]}>
                  {TICKET_STATUS_LABEL[ticket.status]}
                </Badge>
              </div>
              {editable && <StatusControl ticketId={ticket.id} status={ticket.status} />}
            </Card>

            <Card className="flex flex-col gap-3 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
                Customer
              </p>
              <div className="text-[13px]">
                <p className="font-medium text-[var(--color-text)]">
                  {ticket.customerName ?? '—'}
                </p>
                {ticket.customerPhone && (
                  <a
                    href={`tel:${ticket.customerPhone}`}
                    className="mt-0.5 block text-[var(--color-primary)] hover:underline"
                  >
                    {ticket.customerPhone}
                  </a>
                )}
                {ticket.customerEmail && (
                  <p className="mt-0.5 break-all text-[var(--color-muted)]">
                    {ticket.customerEmail}
                  </p>
                )}
              </div>

              {ticket.orderId && ticket.orderCode && (
                <div className="border-t border-[var(--color-border)] pt-3 text-[13px]">
                  <p className="text-xs text-[var(--color-muted)]">Related booking</p>
                  <Link
                    href={`/admin/orders/${ticket.orderId}`}
                    className="font-medium text-[var(--color-primary)] hover:underline"
                  >
                    {ticket.orderCode}
                  </Link>
                  {ticket.orderStatus && (
                    <span className="ml-2 text-[var(--color-muted)]">{ticket.orderStatus}</span>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
