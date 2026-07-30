import { and, desc, eq, sql } from 'drizzle-orm';
import type { Db } from './index';
import { orders } from './schema/orders';
import {
  TICKET_STATUSES,
  TICKET_TOPICS,
  tickets,
  ticketMessages,
  type TicketStatus,
  type TicketTopic,
} from './schema/tickets';

/** Unambiguous alphabet: a customer reads this reference out over the phone. */
const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateTicketRef(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `TK-${Array.from(bytes, (b) => REF_ALPHABET[b % REF_ALPHABET.length]).join('')}`;
}

export type OpenTicketInput = {
  userId: string;
  subject: string;
  topic: TicketTopic;
  body: string;
  /** Optional, and validated to belong to this customer. */
  orderId: number | null;
  authorName: string;
};

export type OpenTicketResult =
  | { ok: true; id: number; ref: string }
  | { ok: false; reason: 'order-not-yours' };

/**
 * Open a ticket with its first message.
 *
 * The order link is checked against the caller, not merely accepted. An
 * unchecked id would let anyone attach another customer's booking and then read
 * that booking's address and phone from the ticket view.
 */
export async function openTicket(db: Db, input: OpenTicketInput): Promise<OpenTicketResult> {
  if (input.orderId !== null) {
    const [order] = await db
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.id, input.orderId), eq(orders.userId, input.userId)))
      .limit(1);
    if (!order) return { ok: false, reason: 'order-not-yours' };
  }

  const now = new Date();
  let id: number | undefined;
  let ref = '';

  // Retry only on a reference collision, which is a fresh random value each time.
  for (let attempt = 0; attempt < 5; attempt++) {
    ref = generateTicketRef();
    try {
      const [row] = await db
        .insert(tickets)
        .values({
          ref,
          userId: input.userId,
          orderId: input.orderId,
          subject: input.subject,
          topic: input.topic,
          status: 'OPEN',
          createdAt: now,
          lastMessageAt: now,
        })
        .returning({ id: tickets.id });
      id = row?.id;
      break;
    } catch (err) {
      if (String(err).includes('UNIQUE') && attempt < 4) continue;
      throw err;
    }
  }

  if (id === undefined) throw new Error('Could not allocate a ticket reference.');

  await db.insert(ticketMessages).values({
    ticketId: id,
    authorType: 'CUSTOMER',
    authorId: input.userId,
    authorName: input.authorName,
    body: input.body,
    internal: false,
    createdAt: now,
  });

  return { ok: true, id, ref };
}

export type PostReplyResult = { ok: true } | { ok: false; reason: 'not-found' | 'closed' };

/**
 * A customer replies to their own ticket.
 *
 * Scoped by userId, so a guessed reference cannot be replied to. Replying to a
 * resolved ticket reopens it: from the customer's side the issue evidently is
 * not resolved, and forcing them to open a second ticket loses the history.
 */
export async function replyAsCustomer(
  db: Db,
  userId: string,
  ref: string,
  body: string,
  authorName: string,
): Promise<PostReplyResult> {
  const [ticket] = await db
    .select({ id: tickets.id, status: tickets.status })
    .from(tickets)
    .where(and(eq(tickets.ref, ref), eq(tickets.userId, userId)))
    .limit(1);

  if (!ticket) return { ok: false, reason: 'not-found' };
  if (ticket.status === 'CLOSED') return { ok: false, reason: 'closed' };

  const now = new Date();
  await db.insert(ticketMessages).values({
    ticketId: ticket.id,
    authorType: 'CUSTOMER',
    authorId: userId,
    authorName,
    body,
    internal: false,
    createdAt: now,
  });

  await db
    .update(tickets)
    .set({ status: 'OPEN', lastMessageAt: now })
    .where(eq(tickets.id, ticket.id));

  return { ok: true };
}

/**
 * Staff reply, or add an internal note.
 *
 * A public reply moves the ticket to ANSWERED — it is now with the customer. An
 * internal note deliberately does NOT: jotting a note to a colleague is not
 * answering anyone, and marking it answered would hide it from the queue.
 */
export async function replyAsStaff(
  db: Db,
  ticketId: number,
  adminId: string,
  authorName: string,
  body: string,
  internal: boolean,
): Promise<PostReplyResult> {
  const [ticket] = await db
    .select({ id: tickets.id, status: tickets.status })
    .from(tickets)
    .where(eq(tickets.id, ticketId))
    .limit(1);

  if (!ticket) return { ok: false, reason: 'not-found' };

  const now = new Date();
  await db.insert(ticketMessages).values({
    ticketId,
    authorType: 'STAFF',
    authorId: adminId,
    authorName,
    body,
    internal,
    createdAt: now,
  });

  await db
    .update(tickets)
    .set({
      lastMessageAt: now,
      ...(internal || ticket.status === 'CLOSED' ? {} : { status: 'ANSWERED' as TicketStatus }),
    })
    .where(eq(tickets.id, ticketId));

  return { ok: true };
}

export type CustomerTicketMessage = {
  authorType: 'CUSTOMER' | 'STAFF';
  authorName: string;
  body: string;
  createdAt: Date;
};

/**
 * Messages as the CUSTOMER may see them.
 *
 * Internal notes are excluded in the query, not filtered by the caller. This is
 * a separate function from the staff read rather than a shared one with an
 * `includeInternal` flag on purpose: a forgotten argument would show staff
 * discussion to the person being discussed, and that is not a mistake worth
 * leaving available.
 */
export async function getCustomerTicketMessages(
  db: Db,
  userId: string,
  ref: string,
): Promise<CustomerTicketMessage[] | null> {
  const [ticket] = await db
    .select({ id: tickets.id })
    .from(tickets)
    .where(and(eq(tickets.ref, ref), eq(tickets.userId, userId)))
    .limit(1);

  if (!ticket) return null;

  const rows = await db
    .select({
      authorType: ticketMessages.authorType,
      authorName: ticketMessages.authorName,
      body: ticketMessages.body,
      createdAt: ticketMessages.createdAt,
    })
    .from(ticketMessages)
    .where(and(eq(ticketMessages.ticketId, ticket.id), eq(ticketMessages.internal, false)))
    .orderBy(ticketMessages.createdAt, ticketMessages.id);

  return rows;
}

/** Messages as STAFF see them: everything, including internal notes. */
export async function getStaffTicketMessages(db: Db, ticketId: number) {
  return db
    .select()
    .from(ticketMessages)
    .where(eq(ticketMessages.ticketId, ticketId))
    .orderBy(ticketMessages.createdAt, ticketMessages.id);
}

export type SetTicketStatusResult = { ok: true } | { ok: false; reason: 'not-found' };

export async function setTicketStatus(
  db: Db,
  ticketId: number,
  status: TicketStatus,
  adminId: string,
  authorName: string,
): Promise<SetTicketStatusResult> {
  const [ticket] = await db
    .select({ id: tickets.id, status: tickets.status })
    .from(tickets)
    .where(eq(tickets.id, ticketId))
    .limit(1);

  if (!ticket) return { ok: false, reason: 'not-found' };
  if (ticket.status === status) return { ok: true };

  await db.update(tickets).set({ status }).where(eq(tickets.id, ticketId));

  // Recorded as an internal note so the change is visible in context to staff
  // without narrating internal workflow at the customer.
  await db.insert(ticketMessages).values({
    ticketId,
    authorType: 'STAFF',
    authorId: adminId,
    authorName,
    body: `Status changed from ${ticket.status} to ${status}`,
    internal: true,
  });

  return { ok: true };
}

/** Open work, for the inbox badge. RESOLVED and CLOSED are not open work. */
export async function countOpenTickets(db: Db): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(tickets)
    .where(sql`${tickets.status} IN ('OPEN','ANSWERED')`);
  return Number(row?.n ?? 0);
}

export async function listCustomerTickets(db: Db, userId: string) {
  return db
    .select({
      ref: tickets.ref,
      subject: tickets.subject,
      topic: tickets.topic,
      status: tickets.status,
      createdAt: tickets.createdAt,
      lastMessageAt: tickets.lastMessageAt,
      orderCode: orders.code,
    })
    .from(tickets)
    .leftJoin(orders, eq(orders.id, tickets.orderId))
    .where(eq(tickets.userId, userId))
    .orderBy(desc(tickets.lastMessageAt));
}

export { TICKET_STATUSES, TICKET_TOPICS };
export type { TicketStatus, TicketTopic };
