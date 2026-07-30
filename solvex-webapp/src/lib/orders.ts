import { and, desc, eq } from 'drizzle-orm';
import { schema, type OrderStatus } from '@solvex/db';
import { db } from './cf';

export type CustomerOrder = {
  id: number;
  code: string;
  serviceName: string;
  categoryName: string;
  scheduledDate: string;
  slotLabel: string;
  basePrice: number;
  creditApplied: number;
  total: number;
  status: OrderStatus;
  notes: string | null;
  nameSnapshot: string;
  phoneSnapshot: string;
  addressSnapshot: string;
  createdAt: Date;
};

function selection() {
  return {
    id: schema.orders.id,
    code: schema.orders.code,
    serviceName: schema.services.name,
    categoryName: schema.categories.name,
    scheduledDate: schema.orders.scheduledDate,
    slotLabel: schema.slotTemplates.label,
    basePrice: schema.orders.basePrice,
    creditApplied: schema.orders.creditApplied,
    total: schema.orders.total,
    status: schema.orders.status,
    notes: schema.orders.notes,
    nameSnapshot: schema.orders.nameSnapshot,
    phoneSnapshot: schema.orders.phoneSnapshot,
    addressSnapshot: schema.orders.addressSnapshot,
    createdAt: schema.orders.createdAt,
  };
}

export async function listCustomerOrders(userId: string): Promise<CustomerOrder[]> {
  return db()
    .select(selection())
    .from(schema.orders)
    .innerJoin(schema.services, eq(schema.services.id, schema.orders.serviceId))
    .innerJoin(schema.categories, eq(schema.categories.id, schema.services.categoryId))
    .innerJoin(schema.slotTemplates, eq(schema.slotTemplates.id, schema.orders.slotId))
    .where(eq(schema.orders.userId, userId))
    .orderBy(desc(schema.orders.createdAt));
}

/**
 * One order by code, scoped to its owner.
 *
 * The userId filter is the authorisation check: order codes are short enough to
 * guess at, so looking one up by code alone would leak another customer's name,
 * phone number and home address.
 */
export async function getCustomerOrder(
  userId: string,
  code: string,
): Promise<CustomerOrder | null> {
  const [row] = await db()
    .select(selection())
    .from(schema.orders)
    .innerJoin(schema.services, eq(schema.services.id, schema.orders.serviceId))
    .innerJoin(schema.categories, eq(schema.categories.id, schema.services.categoryId))
    .innerJoin(schema.slotTemplates, eq(schema.slotTemplates.id, schema.orders.slotId))
    .where(and(eq(schema.orders.code, code), eq(schema.orders.userId, userId)))
    .limit(1);

  return row ?? null;
}

export async function getOrderEvents(orderId: number) {
  return db()
    .select({
      status: schema.orderEvents.status,
      note: schema.orderEvents.note,
      createdAt: schema.orderEvents.createdAt,
    })
    .from(schema.orderEvents)
    .where(eq(schema.orderEvents.orderId, orderId))
    .orderBy(schema.orderEvents.createdAt, schema.orderEvents.id);
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Awaiting confirmation',
  APPROVED: 'Confirmed',
  ON_THE_WAY: 'Technician on the way',
  IN_PROGRESS: 'Work in progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const STATUS_TONE: Record<OrderStatus, 'neutral' | 'info' | 'warning' | 'success' | 'danger'> = {
  PENDING: 'warning',
  APPROVED: 'info',
  ON_THE_WAY: 'info',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

/** The happy path, for rendering progress. CANCELLED is deliberately not in it. */
export const STATUS_FLOW: OrderStatus[] = [
  'PENDING',
  'APPROVED',
  'ON_THE_WAY',
  'IN_PROGRESS',
  'COMPLETED',
];
