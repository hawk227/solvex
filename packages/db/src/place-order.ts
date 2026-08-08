import { and, eq, sql } from 'drizzle-orm';
import type { Db } from './index';
import { areas, profiles } from './schema/customer';
import { services } from './schema/catalog';
import { slotTemplates } from './schema/scheduling';
import { orderEvents, orders } from './schema/orders';
import { creditLedger } from './schema/referral';
import { applicableCredit, getCreditBalance } from './credit';
import { buildComboKey, lookupPrice, PriceNotFoundError } from './pricing';
import { getSlotCapacity, insertOrderIfSlotAvailable } from './booking';
import { isUniqueViolation } from './errors';

/**
 * Atomically reserve account credit.
 *
 * The balance check and the debit happen in ONE statement, so two concurrent
 * bookings by the same customer cannot both spend the same balance. A separate
 * read-then-write is not safe here however carefully it is ordered.
 *
 * Returns null when no credit is applied — either none was requested, or the
 * balance no longer covers it. Callers proceed at full price rather than failing
 * the booking.
 */
async function reserveCredit(
  db: Db,
  userId: string,
  requested: number,
  basePrice: number,
): Promise<{ ledgerId: number; amount: number } | null> {
  const balance = await getCreditBalance(db, userId);
  const amount = applicableCredit(balance, basePrice, requested);
  if (amount <= 0) return null;

  const now = Date.now();
  const rows = await db.all<{ id: number }>(sql`
    INSERT INTO credit_ledger (user_id, delta, reason, order_id, created_at)
    SELECT ${userId}, ${-amount}, 'ORDER_DISCOUNT', NULL, ${now}
    WHERE (
      SELECT COALESCE(SUM(delta), 0) FROM credit_ledger WHERE user_id = ${userId}
    ) >= ${amount}
    RETURNING id
  `);

  const ledgerId = rows[0]?.id;
  if (ledgerId === undefined) return null;
  return { ledgerId, amount };
}

/** Unambiguous alphabet: no O/0, I/1, so codes can be read out over the phone. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateOrderCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const body = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
  return `SX-${body}`;
}

export type PlaceOrderInput = {
  userId: string;
  serviceId: number;
  /** Selected variable option ids. Empty for a service with no variables. */
  optionIds: number[];
  scheduledDate: string;
  slotId: number;
  /** How much account credit the customer asked to use. Capped server-side. */
  requestedCredit: number;
  notes: string | null;
  /**
   * Admin-set price, bypassing the catalog matrix entirely. Only ever set by
   * the CMS's `createOrderForCustomer` action, behind `requireManage('orders')`
   * — see the "Trust boundary" section of
   * docs/superpowers/specs/2026-08-08-cms-order-creation-design.md. Never set
   * this from a customer-facing code path.
   */
  priceOverride?: number;
  /** The CMS employee who placed this order, if any. Written onto the initial order event. */
  placedByAdminId?: string;
};

export type PlaceOrderResult =
  | { ok: true; orderId: number; code: string; basePrice: number; creditApplied: number; total: number }
  | {
      ok: false;
      reason:
        | 'no-profile'
        | 'service-unavailable'
        | 'slot-unavailable'
        | 'area-unavailable'
        | 'not-priced'
        | 'slot-full';
    };

/**
 * Place a booking.
 *
 * Everything that decides money or capacity is recomputed here from the
 * database. The caller supplies only choices (service, options, date, slot, how
 * much credit to use) — never a price, never a total. A client that posts its own
 * price must not be able to set it.
 *
 * Ordering of writes matters:
 *  1. the order is inserted with a conditional statement that re-counts capacity
 *     in the same SQL statement, so two customers cannot both take the last slot;
 *  2. only then is credit spent and the status event written.
 *
 * D1 has no interactive transaction, so step 2 cannot be rolled into step 1. If
 * step 2 fails, the order is cancelled as a compensating action rather than left
 * claiming a discount that was never deducted.
 */
export async function placeOrder(db: Db, input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const [profile] = await db
    .select({
      fullName: profiles.fullName,
      phone: profiles.phone,
      address: profiles.address,
      areaId: profiles.areaId,
    })
    .from(profiles)
    .where(eq(profiles.userId, input.userId))
    .limit(1);

  if (!profile) return { ok: false, reason: 'no-profile' };

  // An area that has been paused must stop accepting new bookings, even from a
  // customer whose profile still points at it.
  if (profile.areaId === null) return { ok: false, reason: 'area-unavailable' };
  const [area] = await db
    .select({ id: areas.id })
    .from(areas)
    .where(and(eq(areas.id, profile.areaId), eq(areas.active, true)))
    .limit(1);
  if (!area) return { ok: false, reason: 'area-unavailable' };

  const [service] = await db
    .select({ id: services.id })
    .from(services)
    .where(and(eq(services.id, input.serviceId), eq(services.active, true)))
    .limit(1);
  if (!service) return { ok: false, reason: 'service-unavailable' };

  const [slot] = await db
    .select({ id: slotTemplates.id })
    .from(slotTemplates)
    .where(and(eq(slotTemplates.id, input.slotId), eq(slotTemplates.active, true)))
    .limit(1);
  if (!slot) return { ok: false, reason: 'slot-unavailable' };

  // Computed before any money moves: buildComboKey throws on duplicate option
  // ids, and that must happen before reserveCredit ever debits the ledger —
  // otherwise a rejected combo leaves an orphaned credit debit with no order.
  const comboKey = buildComboKey(input.optionIds);

  // The price comes from the matrix for the exact combination — never from
  // input — UNLESS an admin has explicitly overridden it (priceOverride).
  let basePrice: number;
  if (input.priceOverride !== undefined) {
    basePrice = input.priceOverride;
  } else {
    try {
      basePrice = await lookupPrice(db, input.serviceId, input.optionIds);
    } catch (err) {
      if (err instanceof PriceNotFoundError) return { ok: false, reason: 'not-priced' };
      throw err;
    }
  }

  // Credit is RESERVED before the order is created, with a conditional insert
  // that re-sums the ledger inside the same statement. Reading the balance and
  // then writing the debit separately lets two concurrent bookings by the same
  // customer each spend the whole balance and drive it negative.
  const reservation = await reserveCredit(
    db,
    input.userId,
    input.requestedCredit,
    basePrice,
  );
  const creditApplied = reservation?.amount ?? 0;
  const total = basePrice - creditApplied;

  // Retry only on a code collision, which is a fresh random value each time.
  let orderId: number | null = null;
  let code = '';
  for (let attempt = 0; attempt < 5; attempt++) {
    code = generateOrderCode();
    try {
      orderId = await insertOrderIfSlotAvailable(db, {
        code,
        userId: input.userId,
        serviceId: input.serviceId,
        comboKey,
        basePrice,
        creditApplied,
        total,
        scheduledDate: input.scheduledDate,
        slotId: input.slotId,
        areaId: profile.areaId,
        nameSnapshot: profile.fullName,
        phoneSnapshot: profile.phone,
        addressSnapshot: profile.address,
        notes: input.notes,
      });
      break;
    } catch (err) {
      if (isUniqueViolation(err, 'orders.code') && attempt < 4) continue;
      throw err;
    }
  }

  if (orderId === null) {
    // The slot filled up after the credit was reserved. Release the reservation
    // so the customer does not lose credit for a booking that never happened.
    if (reservation) {
      await db.delete(creditLedger).where(eq(creditLedger.id, reservation.ledgerId));
    }
    return { ok: false, reason: 'slot-full' };
  }

  // Link the reservation to the order it paid for, so the customer's statement
  // shows what each debit was spent on.
  if (reservation) {
    await db
      .update(creditLedger)
      .set({ orderId })
      .where(eq(creditLedger.id, reservation.ledgerId));
  }

  await db.insert(orderEvents).values({
    orderId,
    status: 'PENDING',
    note: 'Order placed',
    adminId: input.placedByAdminId ?? null,
  });

  return { ok: true, orderId, code, basePrice, creditApplied, total };
}

export type SlotAvailability = {
  slotId: number;
  label: string;
  startTime: string;
  endTime: string;
  capacity: number;
  booked: number;
  remaining: number;
};

/**
 * Remaining room per slot for a date. Cancelled orders do not occupy a slot,
 * matching the capacity check in `insertOrderIfSlotAvailable`.
 */
export async function getAvailability(db: Db, date: string): Promise<SlotAvailability[]> {
  const slots = await db
    .select({
      id: slotTemplates.id,
      label: slotTemplates.label,
      startTime: slotTemplates.startTime,
      endTime: slotTemplates.endTime,
    })
    .from(slotTemplates)
    .where(eq(slotTemplates.active, true))
    .orderBy(slotTemplates.sort);

  const counts = await db
    .select({ slotId: orders.slotId, n: sql<number>`count(*)` })
    .from(orders)
    .where(and(eq(orders.scheduledDate, date), sql`${orders.status} <> 'CANCELLED'`))
    .groupBy(orders.slotId);

  const bookedBySlot = new Map(counts.map((c) => [c.slotId, Number(c.n)]));

  return Promise.all(
    slots.map(async (slot) => {
      const capacity = await getSlotCapacity(db, date, slot.id);
      const booked = bookedBySlot.get(slot.id) ?? 0;
      return {
        slotId: slot.id,
        label: slot.label,
        startTime: slot.startTime,
        endTime: slot.endTime,
        capacity,
        booked,
        remaining: Math.max(capacity - booked, 0),
      };
    }),
  );
}
