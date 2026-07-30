import { desc, eq } from 'drizzle-orm';
import { schema, type TicketStatus } from '@solvex/db';
import { db } from './cf';

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: 'Open',
  ANSWERED: 'Replied',
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
  BOOKING: 'A booking',
  TECHNICIAN: 'The technician or the work',
  BILLING: 'Payment or price',
  REFERRAL: 'Referrals and credit',
  OTHER: 'Something else',
};

/** The customer's own bookings, for optionally attaching one to a ticket. */
export async function getAttachableOrders(userId: string) {
  return db()
    .select({
      code: schema.orders.code,
      serviceName: schema.services.name,
      scheduledDate: schema.orders.scheduledDate,
    })
    .from(schema.orders)
    .innerJoin(schema.services, eq(schema.services.id, schema.orders.serviceId))
    .where(eq(schema.orders.userId, userId))
    .orderBy(desc(schema.orders.createdAt))
    .limit(20);
}

/** One ticket header, scoped to its owner. */
export async function getCustomerTicket(userId: string, ref: string) {
  const [row] = await db()
    .select({
      ref: schema.tickets.ref,
      subject: schema.tickets.subject,
      topic: schema.tickets.topic,
      status: schema.tickets.status,
      createdAt: schema.tickets.createdAt,
      orderCode: schema.orders.code,
    })
    .from(schema.tickets)
    .leftJoin(schema.orders, eq(schema.orders.id, schema.tickets.orderId))
    .where(eq(schema.tickets.ref, ref))
    .limit(1);

  if (!row) return null;

  // Ownership is re-established here rather than trusted from the URL.
  const [owned] = await db()
    .select({ userId: schema.tickets.userId })
    .from(schema.tickets)
    .where(eq(schema.tickets.ref, ref))
    .limit(1);

  return owned?.userId === userId ? row : null;
}
