import { and, eq, sql } from 'drizzle-orm';
import type { Db } from './index';
import { settings } from './schema/settings';
import { slotCapacity } from './schema/scheduling';

const DEFAULT_SLOT_CAPACITY_KEY = 'default_slot_capacity';
const FALLBACK_CAPACITY = 0;

export class SlotFullError extends Error {
  constructor(date: string, slotId: number) {
    super(`Slot ${slotId} on ${date} is fully booked`);
    this.name = 'SlotFullError';
  }
}

export type NewOrderInput = {
  code: string;
  userId: string;
  serviceId: number;
  comboKey: string;
  basePrice: number;
  creditApplied: number;
  total: number;
  scheduledDate: string;
  slotId: number;
  areaId: number | null;
  nameSnapshot: string;
  phoneSnapshot: string;
  addressSnapshot: string;
  notes: string | null;
};

/** Per-day override if present, otherwise the global default setting. */
export async function getSlotCapacity(db: Db, date: string, slotId: number): Promise<number> {
  const override = await db
    .select({ capacity: slotCapacity.capacity })
    .from(slotCapacity)
    .where(and(eq(slotCapacity.date, date), eq(slotCapacity.slotId, slotId)))
    .get();

  if (override) return override.capacity;

  const fallback = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, DEFAULT_SLOT_CAPACITY_KEY))
    .get();

  const parsed = Number.parseInt(fallback?.value ?? '', 10);
  return Number.isNaN(parsed) ? FALLBACK_CAPACITY : parsed;
}

/**
 * Insert an order only if the slot still has room, as ONE atomic statement.
 *
 * The count and the write must not be separate statements: between a read and
 * a write, another request can take the last seat. `INSERT ... SELECT ...
 * WHERE (SELECT count(*) ...) < capacity` evaluates the count inside the same
 * SQLite statement that performs the insert, so it cannot interleave.
 *
 * Cancelled orders do not occupy a seat.
 *
 * Returns the new order id, or null when the slot is full.
 */
export async function insertOrderIfSlotAvailable(
  db: Db,
  input: NewOrderInput,
): Promise<number | null> {
  const capacity = await getSlotCapacity(db, input.scheduledDate, input.slotId);
  if (capacity <= 0) return null;

  const now = Date.now();

  const rows = await db.all<{ id: number }>(sql`
    INSERT INTO orders (
      code, user_id, service_id, combo_key, base_price, credit_applied, total,
      scheduled_date, slot_id, area_id,
      name_snapshot, phone_snapshot, address_snapshot, notes, status, created_at
    )
    SELECT
      ${input.code}, ${input.userId}, ${input.serviceId}, ${input.comboKey},
      ${input.basePrice}, ${input.creditApplied}, ${input.total},
      ${input.scheduledDate}, ${input.slotId}, ${input.areaId},
      ${input.nameSnapshot}, ${input.phoneSnapshot}, ${input.addressSnapshot},
      ${input.notes}, 'PENDING', ${now}
    WHERE (
      SELECT count(*) FROM orders
      WHERE scheduled_date = ${input.scheduledDate}
        AND slot_id = ${input.slotId}
        AND status <> 'CANCELLED'
    ) < ${capacity}
    RETURNING id
  `);

  return rows[0]?.id ?? null;
}
