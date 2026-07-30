import { relations } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { areas } from './customer';
import { services } from './catalog';
import { slotTemplates } from './scheduling';
import { technicians } from './technicians';

export const ORDER_STATUSES = [
  'PENDING',
  'APPROVED',
  'ON_THE_WAY',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * A booking. Contact details are SNAPSHOTTED at placement, never joined from
 * `profiles` — editing a profile must not rewrite where a technician was sent.
 * `basePrice`, `creditApplied`, and `total` are integer BDT taka, with
 * total = basePrice - creditApplied.
 */
export const orders = sqliteTable(
  'orders',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    code: text('code').notNull().unique(),
    userId: text('user_id').notNull(),
    serviceId: integer('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'restrict' }),
    comboKey: text('combo_key').notNull().default(''),
    basePrice: integer('base_price').notNull(),
    creditApplied: integer('credit_applied').notNull().default(0),
    total: integer('total').notNull(),
    scheduledDate: text('scheduled_date').notNull(),
    slotId: integer('slot_id')
      .notNull()
      .references(() => slotTemplates.id, { onDelete: 'restrict' }),
    areaId: integer('area_id').references(() => areas.id, { onDelete: 'set null' }),
    nameSnapshot: text('name_snapshot').notNull(),
    phoneSnapshot: text('phone_snapshot').notNull(),
    addressSnapshot: text('address_snapshot').notNull(),
    notes: text('notes'),
    /**
     * Assigned technician. Nullable — an order exists before anyone is dispatched.
     *
     * CAVEAT: SQLite's ALTER TABLE ADD COLUMN cannot carry an ON DELETE action,
     * so although this declares `set null`, the live constraint is NO ACTION.
     * The effect is RESTRICT-like — a technician who has ever been assigned to an
     * order cannot be deleted. That is the behaviour we want and it is covered by
     * a test, so the declaration is kept only to match drizzle's snapshot;
     * "correcting" it triggers a full rebuild of `orders`, which several tables
     * reference.
     *
     * Take someone off the rota with `active = false`. Deleting a technician
     * would erase who attended past jobs.
     */
    technicianId: integer('technician_id').references(() => technicians.id, {
      onDelete: 'set null',
    }),
    status: text('status').notNull().$type<OrderStatus>().default('PENDING'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    index('orders_user_idx').on(t.userId),
    index('orders_status_idx').on(t.status),
    // The capacity check counts rows for a (date, slot) pair on every booking.
    index('orders_slot_date_idx').on(t.scheduledDate, t.slotId),
  ],
);

/** Append-only status timeline. The customer's tracking page renders this. */
export const orderEvents = sqliteTable(
  'order_events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    status: text('status').notNull().$type<OrderStatus>(),
    note: text('note'),
    adminId: text('admin_id'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index('order_events_order_idx').on(t.orderId)],
);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  service: one(services, { fields: [orders.serviceId], references: [services.id] }),
  technician: one(technicians, {
    fields: [orders.technicianId],
    references: [technicians.id],
  }),
  slot: one(slotTemplates, { fields: [orders.slotId], references: [slotTemplates.id] }),
  area: one(areas, { fields: [orders.areaId], references: [areas.id] }),
  events: many(orderEvents),
}));

export const orderEventsRelations = relations(orderEvents, ({ one }) => ({
  order: one(orders, { fields: [orderEvents.orderId], references: [orders.id] }),
}));
