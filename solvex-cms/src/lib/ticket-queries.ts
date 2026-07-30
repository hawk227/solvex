import { desc, eq, sql } from 'drizzle-orm';
import { schema, type TicketStatus } from '@solvex/db';
import { db } from './cf';

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: 'Open',
  ANSWERED: 'Answered',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

export const TICKET_STATUS_TONE: Record<
  TicketStatus,
  'neutral' | 'info' | 'warning' | 'success' | 'danger'
> = {
  OPEN: 'warning',
  ANSWERED: 'info',
  RESOLVED: 'success',
  CLOSED: 'neutral',
};

export const TOPIC_LABEL: Record<string, string> = {
  BOOKING: 'Booking',
  TECHNICIAN: 'Technician',
  BILLING: 'Billing',
  REFERRAL: 'Referral',
  OTHER: 'Other',
};

/** The queue. Newest activity first — an answered ticket that gets a reply rises. */
export async function listTickets(status?: TicketStatus) {
  const rows = await db()
    .select({
      id: schema.tickets.id,
      ref: schema.tickets.ref,
      subject: schema.tickets.subject,
      topic: schema.tickets.topic,
      status: schema.tickets.status,
      lastMessageAt: schema.tickets.lastMessageAt,
      customerName: schema.profiles.fullName,
      orderCode: schema.orders.code,
    })
    .from(schema.tickets)
    .leftJoin(schema.profiles, eq(schema.profiles.userId, schema.tickets.userId))
    .leftJoin(schema.orders, eq(schema.orders.id, schema.tickets.orderId))
    .orderBy(desc(schema.tickets.lastMessageAt))
    .limit(200);

  return status ? rows.filter((row) => row.status === status) : rows;
}

export async function countTicketsByStatus(): Promise<Record<TicketStatus, number>> {
  const rows = await db()
    .select({ status: schema.tickets.status, n: sql<number>`count(*)` })
    .from(schema.tickets)
    .groupBy(schema.tickets.status);

  const counts: Record<TicketStatus, number> = {
    OPEN: 0,
    ANSWERED: 0,
    RESOLVED: 0,
    CLOSED: 0,
  };
  for (const row of rows) counts[row.status] = Number(row.n);
  return counts;
}

/** One ticket with the customer's contact details, for answering it. */
export async function getTicket(id: number) {
  const [row] = await db()
    .select({
      id: schema.tickets.id,
      ref: schema.tickets.ref,
      subject: schema.tickets.subject,
      topic: schema.tickets.topic,
      status: schema.tickets.status,
      createdAt: schema.tickets.createdAt,
      userId: schema.tickets.userId,
      customerName: schema.profiles.fullName,
      customerPhone: schema.profiles.phone,
      customerEmail: schema.user.email,
      orderId: schema.tickets.orderId,
      orderCode: schema.orders.code,
      orderStatus: schema.orders.status,
    })
    .from(schema.tickets)
    .leftJoin(schema.profiles, eq(schema.profiles.userId, schema.tickets.userId))
    .leftJoin(schema.user, eq(schema.user.id, schema.tickets.userId))
    .leftJoin(schema.orders, eq(schema.orders.id, schema.tickets.orderId))
    .where(eq(schema.tickets.id, id))
    .limit(1);

  return row ?? null;
}
