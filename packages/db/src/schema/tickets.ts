import { relations } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { user } from './customer-auth';
import { adminUser } from './admin-auth';
import { orders } from './orders';

export const TICKET_STATUSES = ['OPEN', 'ANSWERED', 'RESOLVED', 'CLOSED'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_TOPICS = [
  'BOOKING',
  'TECHNICIAN',
  'BILLING',
  'REFERRAL',
  'OTHER',
] as const;
export type TicketTopic = (typeof TICKET_TOPICS)[number];

/**
 * A customer support ticket.
 *
 * `orderId` is optional — plenty of enquiries ("do you cover Uttara?") are not
 * about a booking. When it IS set, the order must belong to the same customer;
 * that is enforced when the ticket is created, because otherwise attaching an
 * arbitrary order id would leak another customer's address and phone number
 * into the staff view alongside the ticket.
 */
export const tickets = sqliteTable(
  'tickets',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /** Short reference the customer can quote. Unguessable, unlike a row id. */
    ref: text('ref').notNull().unique(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    orderId: integer('order_id').references(() => orders.id, { onDelete: 'set null' }),
    subject: text('subject').notNull(),
    topic: text('topic').notNull().$type<TicketTopic>().default('OTHER'),
    status: text('status').notNull().$type<TicketStatus>().default('OPEN'),
    /** Which staff member picked it up. Nullable until someone does. */
    assignedTo: text('assigned_to').references(() => adminUser.id),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
    /** Sorting an inbox by "last activity" is the only order that makes sense. */
    lastMessageAt: integer('last_message_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    index('tickets_user_idx').on(t.userId),
    index('tickets_status_idx').on(t.status),
    index('tickets_activity_idx').on(t.lastMessageAt),
  ],
);

export const TICKET_AUTHORS = ['CUSTOMER', 'STAFF'] as const;
export type TicketAuthor = (typeof TICKET_AUTHORS)[number];

/**
 * One message on a ticket.
 *
 * `internal` marks a staff-only note. Nothing that reads messages for a customer
 * may return these, which is why customer-facing reads go through a dedicated
 * function rather than a shared one with a flag — a forgotten argument would
 * leak staff discussion to the person being discussed.
 */
export const ticketMessages = sqliteTable(
  'ticket_messages',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    ticketId: integer('ticket_id')
      .notNull()
      .references(() => tickets.id, { onDelete: 'cascade' }),
    authorType: text('author_type').notNull().$type<TicketAuthor>(),
    /** Customer user id or admin user id, depending on authorType. */
    authorId: text('author_id'),
    /** Denormalised so a deleted account still shows who wrote what. */
    authorName: text('author_name').notNull(),
    body: text('body').notNull(),
    internal: integer('internal', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index('ticket_messages_ticket_idx').on(t.ticketId)],
);

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  customer: one(user, { fields: [tickets.userId], references: [user.id] }),
  order: one(orders, { fields: [tickets.orderId], references: [orders.id] }),
  messages: many(ticketMessages),
}));

export const ticketMessagesRelations = relations(ticketMessages, ({ one }) => ({
  ticket: one(tickets, { fields: [ticketMessages.ticketId], references: [tickets.id] }),
}));
