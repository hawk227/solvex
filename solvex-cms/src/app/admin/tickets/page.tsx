import Link from 'next/link';
import { TICKET_STATUSES, type TicketStatus } from '@solvex/db';
import { requireView } from '@/lib/session';
import { Topbar, PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableWrap, Th, Td, Tr, EmptyRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format';
import {
  TICKET_STATUS_LABEL,
  TICKET_STATUS_TONE,
  TOPIC_LABEL,
  countTicketsByStatus,
  listTickets,
} from '@/lib/ticket-queries';

export const metadata = { title: 'Tickets — SolveX Admin' };

export default async function TicketsPage({ searchParams }: PageProps<'/admin/tickets'>) {
  await requireView('tickets');

  const params = await searchParams;
  const raw = Array.isArray(params.status) ? params.status[0] : params.status;
  const filter = TICKET_STATUSES.find((s) => s === raw) as TicketStatus | undefined;

  const rows = await listTickets(filter);
  const counts = await countTicketsByStatus();
  const total = TICKET_STATUSES.reduce((sum, status) => sum + counts[status], 0);

  const chip = (active: boolean) =>
    `inline-flex h-8 items-center gap-2 rounded-[var(--radius-pill)] px-3 text-[13px] ${
      active
        ? 'bg-[var(--color-text)] text-white'
        : 'bg-[var(--color-surface)] text-[var(--color-muted)]'
    }`;

  return (
    <>
      <Topbar breadcrumb={['Admin', 'Tickets']} />
      <main className="flex-1 p-6">
        <PageHeader
          title="Tickets"
          subtitle={`${rows.length} shown · ${counts.OPEN + counts.ANSWERED} still open`}
        />

        <div className="mb-5 flex flex-wrap items-center gap-2">
          <Link href="/admin/tickets" className={chip(!filter)}>
            All <span className="font-medium">{total}</span>
          </Link>
          {TICKET_STATUSES.map((status) => (
            <Link
              key={status}
              href={`/admin/tickets?status=${status}`}
              className={chip(filter === status)}
            >
              {TICKET_STATUS_LABEL[status]} <span className="font-medium">{counts[status]}</span>
            </Link>
          ))}
        </div>

        <Card>
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Ticket</Th>
                  <Th>Customer</Th>
                  <Th>Subject</Th>
                  <Th>Topic</Th>
                  <Th>Last activity</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <EmptyRow colSpan={6}>No tickets here.</EmptyRow>
                ) : (
                  rows.map((ticket) => (
                    <Tr key={ticket.id}>
                      <Td>
                        <Link
                          href={`/admin/tickets/${ticket.id}`}
                          className="font-medium text-[var(--color-primary)] hover:underline"
                        >
                          {ticket.ref}
                        </Link>
                        {ticket.orderCode && (
                          <span className="block text-xs text-[var(--color-muted)]">
                            {ticket.orderCode}
                          </span>
                        )}
                      </Td>
                      <Td>{ticket.customerName ?? '—'}</Td>
                      <Td>{ticket.subject}</Td>
                      <Td>{TOPIC_LABEL[ticket.topic] ?? ticket.topic}</Td>
                      <Td>{formatDateTime(ticket.lastMessageAt)}</Td>
                      <Td>
                        <Badge tone={TICKET_STATUS_TONE[ticket.status]}>
                          {TICKET_STATUS_LABEL[ticket.status]}
                        </Badge>
                      </Td>
                    </Tr>
                  ))
                )}
              </tbody>
            </Table>
          </TableWrap>
        </Card>
      </main>
    </>
  );
}
