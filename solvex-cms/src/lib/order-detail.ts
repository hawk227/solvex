import { eq } from 'drizzle-orm';
import { schema, type OrderStatus } from '@solvex/db';
import { db } from '@/lib/cf';

export type AdminOrderDetail = {
  id: number;
  code: string;
  status: OrderStatus;
  userId: string;
  serviceName: string;
  serviceId: number;
  categoryName: string;
  categoryId: number;
  comboKey: string;
  scheduledDate: string;
  slotLabel: string;
  slotWindow: string;
  areaId: number | null;
  areaName: string | null;
  basePrice: number;
  creditApplied: number;
  total: number;
  notes: string | null;
  nameSnapshot: string;
  phoneSnapshot: string;
  addressSnapshot: string;
  createdAt: Date;
  technicianId: number | null;
  technicianName: string | null;
  technicianPhone: string | null;
  customerEmail: string | null;
};

export async function getAdminOrder(id: number): Promise<AdminOrderDetail | null> {
  const [row] = await db()
    .select({
      id: schema.orders.id,
      code: schema.orders.code,
      status: schema.orders.status,
      userId: schema.orders.userId,
      serviceName: schema.services.name,
      serviceId: schema.services.id,
      categoryName: schema.categories.name,
      categoryId: schema.categories.id,
      comboKey: schema.orders.comboKey,
      scheduledDate: schema.orders.scheduledDate,
      slotLabel: schema.slotTemplates.label,
      slotStart: schema.slotTemplates.startTime,
      slotEnd: schema.slotTemplates.endTime,
      areaId: schema.orders.areaId,
      areaName: schema.areas.name,
      basePrice: schema.orders.basePrice,
      creditApplied: schema.orders.creditApplied,
      total: schema.orders.total,
      notes: schema.orders.notes,
      nameSnapshot: schema.orders.nameSnapshot,
      phoneSnapshot: schema.orders.phoneSnapshot,
      addressSnapshot: schema.orders.addressSnapshot,
      createdAt: schema.orders.createdAt,
      technicianId: schema.orders.technicianId,
      technicianName: schema.technicians.fullName,
      technicianPhone: schema.technicians.phone,
      customerEmail: schema.user.email,
    })
    .from(schema.orders)
    .innerJoin(schema.services, eq(schema.services.id, schema.orders.serviceId))
    .innerJoin(schema.categories, eq(schema.categories.id, schema.services.categoryId))
    .innerJoin(schema.slotTemplates, eq(schema.slotTemplates.id, schema.orders.slotId))
    .leftJoin(schema.areas, eq(schema.areas.id, schema.orders.areaId))
    .leftJoin(schema.technicians, eq(schema.technicians.id, schema.orders.technicianId))
    .leftJoin(schema.user, eq(schema.user.id, schema.orders.userId))
    .where(eq(schema.orders.id, id))
    .limit(1);

  if (!row) return null;
  const { slotStart, slotEnd, ...rest } = row;
  return { ...rest, slotWindow: `${slotStart} – ${slotEnd}` };
}

/** Human labels for the selected variable options on this order. */
export async function getOrderOptionLabels(comboKey: string): Promise<string[]> {
  if (!comboKey) return [];
  const ids = comboKey
    .split('-')
    .map((s) => Number.parseInt(s, 10))
    .filter(Number.isInteger);
  if (ids.length === 0) return [];

  const rows = await db()
    .select({
      id: schema.variableOptions.id,
      label: schema.variableOptions.label,
      group: schema.variableGroups.name,
    })
    .from(schema.variableOptions)
    .innerJoin(
      schema.variableGroups,
      eq(schema.variableGroups.id, schema.variableOptions.groupId),
    );

  return rows.filter((r) => ids.includes(r.id)).map((r) => `${r.group}: ${r.label}`);
}

export async function getAdminOrderEvents(orderId: number) {
  return db()
    .select({
      status: schema.orderEvents.status,
      note: schema.orderEvents.note,
      adminId: schema.orderEvents.adminId,
      createdAt: schema.orderEvents.createdAt,
    })
    .from(schema.orderEvents)
    .where(eq(schema.orderEvents.orderId, orderId))
    .orderBy(schema.orderEvents.createdAt, schema.orderEvents.id);
}
