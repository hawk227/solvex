import { env } from 'cloudflare:test';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { getDb, schema } from '../src/index';
import { getSlotCapacity, insertOrderIfSlotAvailable } from '../src/booking';
import type { NewOrderInput } from '../src/booking';

const DATE = '2026-09-01';

async function fixture() {
  const db = getDb(env.DB);
  const [category] = await db
    .insert(schema.categories)
    .values({ slug: `c-${crypto.randomUUID()}`, name: 'C' })
    .returning();
  const [service] = await db
    .insert(schema.services)
    .values({ categoryId: category!.id, slug: `s-${crypto.randomUUID()}`, name: 'S' })
    .returning();
  const [slot] = await db
    .insert(schema.slotTemplates)
    .values({ label: `Morning ${crypto.randomUUID()}`, startTime: '09:00', endTime: '12:00' })
    .returning();
  return { db, service: service!, slot: slot! };
}

function orderInput(serviceId: number, slotId: number, code: string): NewOrderInput {
  return {
    code,
    userId: `user_${crypto.randomUUID()}`,
    serviceId,
    comboKey: '',
    basePrice: 1500,
    creditApplied: 0,
    total: 1500,
    scheduledDate: DATE,
    slotId,
    areaId: null,
    nameSnapshot: 'Test Customer',
    phoneSnapshot: '+8801700000000',
    addressSnapshot: 'Somewhere in Dhaka',
    notes: null,
  };
}

describe('getSlotCapacity', () => {
  beforeEach(async () => {
    const db = getDb(env.DB);
    await db.delete(schema.settings);
    await db.insert(schema.settings).values({ key: 'default_slot_capacity', value: '3' });
  });

  it('falls back to the default when there is no override row', async () => {
    const { db, slot } = await fixture();
    await expect(getSlotCapacity(db, DATE, slot.id)).resolves.toBe(3);
  });

  it('prefers the per-day override', async () => {
    const { db, slot } = await fixture();
    await db.insert(schema.slotCapacity).values({ date: DATE, slotId: slot.id, capacity: 1 });
    await expect(getSlotCapacity(db, DATE, slot.id)).resolves.toBe(1);
  });
});

describe('insertOrderIfSlotAvailable', () => {
  beforeEach(async () => {
    const db = getDb(env.DB);
    await db.delete(schema.settings);
    await db.insert(schema.settings).values({ key: 'default_slot_capacity', value: '2' });
  });

  it('books while capacity remains and refuses once it is gone', async () => {
    const { db, service, slot } = await fixture();

    const first = await insertOrderIfSlotAvailable(db, orderInput(service.id, slot.id, 'SX-A1'));
    const second = await insertOrderIfSlotAvailable(db, orderInput(service.id, slot.id, 'SX-A2'));
    const third = await insertOrderIfSlotAvailable(db, orderInput(service.id, slot.id, 'SX-A3'));

    expect(first).toBeTypeOf('number');
    expect(second).toBeTypeOf('number');
    expect(third).toBeNull();
  });

  it('lets exactly one of two concurrent bookings take the last seat', async () => {
    const { db, service, slot } = await fixture();
    await db.insert(schema.slotCapacity).values({ date: DATE, slotId: slot.id, capacity: 1 });

    const results = await Promise.all([
      insertOrderIfSlotAvailable(db, orderInput(service.id, slot.id, 'SX-B1')),
      insertOrderIfSlotAvailable(db, orderInput(service.id, slot.id, 'SX-B2')),
    ]);

    expect(results.filter((r) => r !== null)).toHaveLength(1);

    const booked = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.slotId, slot.id));
    expect(booked).toHaveLength(1);
  });

  it('does not count cancelled orders against capacity', async () => {
    const { db, service, slot } = await fixture();
    await db.insert(schema.slotCapacity).values({ date: DATE, slotId: slot.id, capacity: 1 });

    const id = await insertOrderIfSlotAvailable(db, orderInput(service.id, slot.id, 'SX-C1'));
    expect(id).toBeTypeOf('number');

    await db.update(schema.orders).set({ status: 'CANCELLED' }).where(eq(schema.orders.id, id!));

    const second = await insertOrderIfSlotAvailable(db, orderInput(service.id, slot.id, 'SX-C2'));
    expect(second).toBeTypeOf('number');
  });
});
