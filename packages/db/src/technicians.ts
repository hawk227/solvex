import { and, eq, inArray, sql } from 'drizzle-orm';
import type { Db } from './index';
import { orders, orderEvents } from './schema/orders';
import { technicians, technicianAreas, technicianSkills } from './schema/technicians';

export type AssignResult =
  | { ok: true; technicianName: string | null }
  | {
      ok: false;
      reason: 'order-not-found' | 'technician-not-found' | 'technician-inactive' | 'order-closed';
    };

/** An order that is finished or cancelled is a historic record, not a dispatch. */
const ASSIGNABLE_STATUSES = ['PENDING', 'APPROVED', 'ON_THE_WAY', 'IN_PROGRESS'] as const;

/**
 * Assign a technician to an order, or clear the assignment with `null`.
 *
 * Only an ACTIVE technician can be assigned — deactivating someone is how you
 * take them off the rota, and it would be useless if they could still be
 * dispatched.
 *
 * Suitability (does this technician cover the area, do they have the skill) is
 * deliberately NOT enforced. Real dispatch overrides it constantly — someone
 * covers a neighbouring area for one job. The CMS surfaces suitability so the
 * choice is informed; it does not block it.
 */
export async function assignTechnician(
  db: Db,
  orderId: number,
  technicianId: number | null,
  adminId?: string,
): Promise<AssignResult> {
  const [order] = await db
    .select({ id: orders.id, status: orders.status, current: orders.technicianId })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) return { ok: false, reason: 'order-not-found' };
  if (!ASSIGNABLE_STATUSES.includes(order.status as (typeof ASSIGNABLE_STATUSES)[number])) {
    return { ok: false, reason: 'order-closed' };
  }

  let name: string | null = null;

  if (technicianId !== null) {
    const [tech] = await db
      .select({ id: technicians.id, fullName: technicians.fullName, active: technicians.active })
      .from(technicians)
      .where(eq(technicians.id, technicianId))
      .limit(1);

    if (!tech) return { ok: false, reason: 'technician-not-found' };
    if (!tech.active) return { ok: false, reason: 'technician-inactive' };
    name = tech.fullName;
  }

  // Conditional on the order still being assignable, so a status change landing
  // at the same moment wins rather than both writes applying.
  const updated = await db
    .update(orders)
    .set({ technicianId })
    .where(and(eq(orders.id, orderId), inArray(orders.status, [...ASSIGNABLE_STATUSES])))
    .returning({ id: orders.id });

  if (updated.length === 0) return { ok: false, reason: 'order-closed' };

  // Only record an event when the assignment actually changed, so re-saving the
  // same technician does not spam the customer's timeline.
  if (order.current !== technicianId) {
    await db.insert(orderEvents).values({
      orderId,
      status: order.status,
      note: name ? `Technician assigned: ${name}` : 'Technician assignment removed',
      adminId: adminId ?? null,
    });
  }

  return { ok: true, technicianName: name };
}

export type TechnicianOption = {
  id: number;
  fullName: string;
  phone: string;
  /** Open jobs currently on this technician, for load balancing. */
  openJobs: number;
  coversArea: boolean;
  hasSkill: boolean;
};

/**
 * Active technicians, annotated for one specific order so the picker can show
 * who fits and who is already busy.
 */
export async function getTechnicianOptions(
  db: Db,
  opts: { areaId: number | null; categoryId: number | null },
): Promise<TechnicianOption[]> {
  const rows = await db.all<{
    id: number;
    fullName: string;
    phone: string;
    openJobs: number;
    coversArea: number;
    hasSkill: number;
  }>(sql`
    SELECT
      technicians.id            AS id,
      technicians.full_name     AS fullName,
      technicians.phone         AS phone,
      (
        SELECT count(*) FROM orders
        WHERE orders.technician_id = technicians.id
          AND orders.status IN ('PENDING','APPROVED','ON_THE_WAY','IN_PROGRESS')
      ) AS openJobs,
      CASE WHEN ${opts.areaId} IS NULL THEN 0 ELSE EXISTS (
        SELECT 1 FROM technician_areas
        WHERE technician_areas.technician_id = technicians.id
          AND technician_areas.area_id = ${opts.areaId}
      ) END AS coversArea,
      CASE WHEN ${opts.categoryId} IS NULL THEN 0 ELSE EXISTS (
        SELECT 1 FROM technician_skills
        WHERE technician_skills.technician_id = technicians.id
          AND technician_skills.category_id = ${opts.categoryId}
      ) END AS hasSkill
    FROM technicians
    WHERE technicians.active = 1
    ORDER BY hasSkill DESC, coversArea DESC, openJobs ASC, technicians.full_name ASC
  `);

  return rows.map((r) => ({
    id: Number(r.id),
    fullName: r.fullName,
    phone: r.phone,
    openJobs: Number(r.openJobs),
    coversArea: Number(r.coversArea) === 1,
    hasSkill: Number(r.hasSkill) === 1,
  }));
}

/** Replace a technician's skill and area sets in one go. */
export async function setTechnicianCoverage(
  db: Db,
  technicianId: number,
  categoryIds: number[],
  areaIds: number[],
): Promise<void> {
  await db.delete(technicianSkills).where(eq(technicianSkills.technicianId, technicianId));
  await db.delete(technicianAreas).where(eq(technicianAreas.technicianId, technicianId));

  if (categoryIds.length > 0) {
    await db
      .insert(technicianSkills)
      .values(categoryIds.map((categoryId) => ({ technicianId, categoryId })));
  }
  if (areaIds.length > 0) {
    await db.insert(technicianAreas).values(areaIds.map((areaId) => ({ technicianId, areaId })));
  }
}
