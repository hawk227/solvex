import { env } from 'cloudflare:test';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { getDb, schema } from '../src/index';
import { getAvailability, generateOrderCode, placeOrder } from '../src/place-order';
import { getCreditBalance } from '../src/credit';

const DATE = '2026-10-15';

type Fixture = Awaited<ReturnType<typeof fixture>>;

async function fixture(opts: { price?: number; capacity?: number; areaActive?: boolean } = {}) {
  const db = getDb(env.DB);
  const tag = crypto.randomUUID().slice(0, 8);

  const userId = `user_${tag}`;
  await db
    .insert(schema.user)
    .values({ id: userId, name: 'Rafiq', email: `${userId}@example.com`, emailVerified: true });

  const [area] = await db
    .insert(schema.areas)
    .values({ name: `Area ${tag}`, active: opts.areaActive ?? true })
    .returning();

  await db.insert(schema.profiles).values({
    userId,
    fullName: 'Rafiq Hasan',
    phone: '+8801712345678',
    address: 'House 12, Road 4, Dhanmondi',
    areaId: area!.id,
    referralCode: `REF${tag.toUpperCase()}`,
  });

  const [category] = await db
    .insert(schema.categories)
    .values({ slug: `cat-${tag}`, name: 'Cat' })
    .returning();
  const [service] = await db
    .insert(schema.services)
    .values({ categoryId: category!.id, slug: `svc-${tag}`, name: 'Service' })
    .returning();

  if (opts.price !== undefined) {
    await db
      .insert(schema.servicePrices)
      .values({ serviceId: service!.id, comboKey: '', price: opts.price });
  }

  const [slot] = await db
    .insert(schema.slotTemplates)
    .values({ label: `Slot ${tag}`, startTime: '09:00', endTime: '12:00' })
    .returning();

  if (opts.capacity !== undefined) {
    await db
      .insert(schema.slotCapacity)
      .values({ date: DATE, slotId: slot!.id, capacity: opts.capacity });
  }

  return { db, userId, area: area!, service: service!, slot: slot! };
}

function input(f: Fixture, over: Partial<Parameters<typeof placeOrder>[1]> = {}) {
  return {
    userId: f.userId,
    serviceId: f.service.id,
    optionIds: [],
    scheduledDate: DATE,
    slotId: f.slot.id,
    requestedCredit: 0,
    notes: null,
    ...over,
  };
}

beforeEach(async () => {
  const db = getDb(env.DB);
  await db.delete(schema.settings);
  await db.insert(schema.settings).values({ key: 'default_slot_capacity', value: '3' });
});

describe('generateOrderCode', () => {
  it('is prefixed and avoids ambiguous characters', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateOrderCode();
      expect(code).toMatch(/^SX-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
    }
  });

  it('does not repeat across many draws', () => {
    const codes = new Set(Array.from({ length: 500 }, generateOrderCode));
    expect(codes.size).toBe(500);
  });
});

describe('placeOrder', () => {
  it('uses the price from the matrix, not anything the caller supplies', async () => {
    const f = await fixture({ price: 1500 });

    // A hostile caller cannot pass a price at all — the type has no such field —
    // and the stored total must match the configured price.
    const result = await placeOrder(f.db, input(f));
    expect(result).toMatchObject({ ok: true, basePrice: 1500, creditApplied: 0, total: 1500 });

    const [order] = await f.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.userId, f.userId));
    expect(order).toMatchObject({ basePrice: 1500, total: 1500, status: 'PENDING' });
  });

  it('snapshots contact details onto the order', async () => {
    const f = await fixture({ price: 1000 });
    await placeOrder(f.db, input(f));

    const [order] = await f.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.userId, f.userId));

    expect(order).toMatchObject({
      nameSnapshot: 'Rafiq Hasan',
      phoneSnapshot: '+8801712345678',
      addressSnapshot: 'House 12, Road 4, Dhanmondi',
    });

    // Editing the profile afterwards must not rewrite the order.
    await f.db
      .update(schema.profiles)
      .set({ address: 'Somewhere else entirely' })
      .where(eq(schema.profiles.userId, f.userId));

    const [after] = await f.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.userId, f.userId));
    expect(after!.addressSnapshot).toBe('House 12, Road 4, Dhanmondi');
  });

  it('writes a PENDING event so tracking has a first entry', async () => {
    const f = await fixture({ price: 1000 });
    const result = await placeOrder(f.db, input(f));
    if (!result.ok) throw new Error('expected success');

    const events = await f.db
      .select()
      .from(schema.orderEvents)
      .where(eq(schema.orderEvents.orderId, result.orderId));
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ status: 'PENDING' });
  });

  it('caps requested credit at the balance and records the spend', async () => {
    const f = await fixture({ price: 2000 });
    await f.db
      .insert(schema.creditLedger)
      .values({ userId: f.userId, delta: 300, reason: 'REFERRAL_REWARD' });

    const result = await placeOrder(f.db, input(f, { requestedCredit: 5000 }));

    expect(result).toMatchObject({ ok: true, basePrice: 2000, creditApplied: 300, total: 1700 });
    await expect(getCreditBalance(f.db, f.userId)).resolves.toBe(0);
  });

  it('caps credit at the order total so the total never goes negative', async () => {
    const f = await fixture({ price: 800 });
    await f.db
      .insert(schema.creditLedger)
      .values({ userId: f.userId, delta: 5000, reason: 'REFERRAL_REWARD' });

    const result = await placeOrder(f.db, input(f, { requestedCredit: 5000 }));

    expect(result).toMatchObject({ ok: true, creditApplied: 800, total: 0 });
    // The unused remainder stays on the account.
    await expect(getCreditBalance(f.db, f.userId)).resolves.toBe(4200);
  });

  it('writes no ledger row when no credit is used', async () => {
    const f = await fixture({ price: 900 });
    const result = await placeOrder(f.db, input(f));
    if (!result.ok) throw new Error('expected success');

    const rows = await f.db
      .select()
      .from(schema.creditLedger)
      .where(eq(schema.creditLedger.orderId, result.orderId));
    expect(rows).toHaveLength(0);
  });

  it('refuses an unpriced combination instead of guessing', async () => {
    const f = await fixture();
    expect(await placeOrder(f.db, input(f))).toEqual({ ok: false, reason: 'not-priced' });
  });

  it('refuses when the customer has no profile', async () => {
    const f = await fixture({ price: 1000 });
    await f.db.delete(schema.profiles).where(eq(schema.profiles.userId, f.userId));
    expect(await placeOrder(f.db, input(f))).toEqual({ ok: false, reason: 'no-profile' });
  });

  it('refuses when the area has been paused', async () => {
    const f = await fixture({ price: 1000, areaActive: false });
    expect(await placeOrder(f.db, input(f))).toEqual({ ok: false, reason: 'area-unavailable' });
  });

  it('refuses a deactivated service', async () => {
    const f = await fixture({ price: 1000 });
    await f.db
      .update(schema.services)
      .set({ active: false })
      .where(eq(schema.services.id, f.service.id));
    expect(await placeOrder(f.db, input(f))).toEqual({ ok: false, reason: 'service-unavailable' });
  });

  it('refuses a closed slot', async () => {
    const f = await fixture({ price: 1000 });
    await f.db
      .update(schema.slotTemplates)
      .set({ active: false })
      .where(eq(schema.slotTemplates.id, f.slot.id));
    expect(await placeOrder(f.db, input(f))).toEqual({ ok: false, reason: 'slot-unavailable' });
  });

  it('reports slot-full once capacity is used up', async () => {
    const f = await fixture({ price: 1000, capacity: 1 });

    expect((await placeOrder(f.db, input(f))).ok).toBe(true);
    expect(await placeOrder(f.db, input(f))).toEqual({ ok: false, reason: 'slot-full' });
  });

  it('lets exactly one of two concurrent bookings take the last slot', async () => {
    const f = await fixture({ price: 1000, capacity: 1 });

    const results = await Promise.all([
      placeOrder(f.db, input(f)),
      placeOrder(f.db, input(f)),
    ]);

    expect(results.filter((r) => r.ok)).toHaveLength(1);

    const booked = await f.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.scheduledDate, DATE));
    expect(booked.filter((o) => o.slotId === f.slot.id && o.status !== 'CANCELLED')).toHaveLength(1);
  });

  it('does not spend credit when the slot turns out to be full', async () => {
    const f = await fixture({ price: 1000, capacity: 0 });
    await f.db
      .insert(schema.creditLedger)
      .values({ userId: f.userId, delta: 500, reason: 'REFERRAL_REWARD' });

    expect(await placeOrder(f.db, input(f, { requestedCredit: 500 }))).toEqual({
      ok: false,
      reason: 'slot-full',
    });
    await expect(getCreditBalance(f.db, f.userId)).resolves.toBe(500);
  });

  it('uses priceOverride instead of the catalog price when provided', async () => {
    const f = await fixture({ price: 1500 });
    const result = await placeOrder(f.db, input(f, { priceOverride: 700 }));
    expect(result).toMatchObject({ ok: true, basePrice: 700, total: 700 });
  });

  it('accepts priceOverride even when the combination has no catalog price', async () => {
    const f = await fixture();
    const result = await placeOrder(f.db, input(f, { priceOverride: 500 }));
    expect(result).toMatchObject({ ok: true, basePrice: 500, total: 500 });
  });

  it('writes placedByAdminId onto the initial order event', async () => {
    const f = await fixture({ price: 1000 });
    const result = await placeOrder(f.db, input(f, { placedByAdminId: 'admin_123' }));
    if (!result.ok) throw new Error('expected success');

    const [event] = await f.db
      .select()
      .from(schema.orderEvents)
      .where(eq(schema.orderEvents.orderId, result.orderId));
    expect(event).toMatchObject({ adminId: 'admin_123' });
  });

  it('leaves adminId null when placedByAdminId is not given', async () => {
    const f = await fixture({ price: 1000 });
    const result = await placeOrder(f.db, input(f));
    if (!result.ok) throw new Error('expected success');

    const [event] = await f.db
      .select()
      .from(schema.orderEvents)
      .where(eq(schema.orderEvents.orderId, result.orderId));
    expect(event!.adminId).toBeNull();
  });
});

describe('getAvailability', () => {
  it('reports remaining room and excludes cancelled orders', async () => {
    const f = await fixture({ price: 1000, capacity: 2 });

    let avail = (await getAvailability(f.db, DATE)).find((s) => s.slotId === f.slot.id)!;
    expect(avail).toMatchObject({ capacity: 2, booked: 0, remaining: 2 });

    const first = await placeOrder(f.db, input(f));
    if (!first.ok) throw new Error('expected success');

    avail = (await getAvailability(f.db, DATE)).find((s) => s.slotId === f.slot.id)!;
    expect(avail).toMatchObject({ booked: 1, remaining: 1 });

    await f.db
      .update(schema.orders)
      .set({ status: 'CANCELLED' })
      .where(eq(schema.orders.id, first.orderId));

    avail = (await getAvailability(f.db, DATE)).find((s) => s.slotId === f.slot.id)!;
    expect(avail).toMatchObject({ booked: 0, remaining: 2 });
  });

  it('never reports negative remaining', async () => {
    const f = await fixture({ price: 1000, capacity: 1 });
    await placeOrder(f.db, input(f));
    // Capacity lowered below what is already booked.
    await f.db
      .update(schema.slotCapacity)
      .set({ capacity: 0 })
      .where(eq(schema.slotCapacity.slotId, f.slot.id));

    const avail = (await getAvailability(f.db, DATE)).find((s) => s.slotId === f.slot.id)!;
    expect(avail.remaining).toBe(0);
  });
});

describe('concurrent credit spend by the same customer', () => {
  it('does not let the same balance be spent twice', async () => {
    const f = await fixture({ price: 1000, capacity: 5 });
    await f.db
      .insert(schema.creditLedger)
      .values({ userId: f.userId, delta: 500, reason: 'REFERRAL_REWARD' });

    const results = await Promise.all([
      placeOrder(f.db, input(f, { requestedCredit: 500 })),
      placeOrder(f.db, input(f, { requestedCredit: 500 })),
    ]);

    const spent = results
      .filter((r): r is Extract<typeof r, { ok: true }> => r.ok)
      .reduce((sum, r) => sum + r.creditApplied, 0);

    // Only 500 existed, so at most 500 may be applied across both orders and the
    // balance must never go negative.
    expect(spent).toBeLessThanOrEqual(500);
    await expect(getCreditBalance(f.db, f.userId)).resolves.toBeGreaterThanOrEqual(0);
  });
});

describe('credit reservation is released on failure', () => {
  it('returns the credit when the slot fills between reserving and inserting', async () => {
    const f = await fixture({ price: 1000, capacity: 1 });
    await f.db
      .insert(schema.creditLedger)
      .values({ userId: f.userId, delta: 400, reason: 'REFERRAL_REWARD' });

    // Fill the only slot with a different customer's booking.
    const other = await fixture({ price: 1000 });
    await f.db.insert(schema.orders).values({
      code: `SX-OTHER${crypto.randomUUID().slice(0, 3).toUpperCase()}`,
      userId: other.userId,
      serviceId: other.service.id,
      comboKey: '',
      basePrice: 1000,
      creditApplied: 0,
      total: 1000,
      scheduledDate: DATE,
      slotId: f.slot.id,
      nameSnapshot: 'Other',
      phoneSnapshot: '+8801700000000',
      addressSnapshot: 'Elsewhere',
      status: 'PENDING',
    });

    const result = await placeOrder(f.db, input(f, { requestedCredit: 400 }));

    expect(result).toEqual({ ok: false, reason: 'slot-full' });
    // The whole balance must still be there.
    await expect(getCreditBalance(f.db, f.userId)).resolves.toBe(400);
  });
});
