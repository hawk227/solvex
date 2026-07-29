import { env } from 'cloudflare:test';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { getDb, schema } from '../src/index';
import { ORDER_STATUSES } from '../src/schema/orders';

async function seedService(db: ReturnType<typeof getDb>) {
  const [category] = await db
    .insert(schema.categories)
    .values({ slug: `cat-${crypto.randomUUID()}`, name: 'Cat' })
    .returning();
  const [service] = await db
    .insert(schema.services)
    .values({ categoryId: category!.id, slug: `svc-${crypto.randomUUID()}`, name: 'Svc' })
    .returning();
  const [slot] = await db
    .insert(schema.slotTemplates)
    .values({ label: `Morning ${crypto.randomUUID()}`, startTime: '09:00', endTime: '12:00' })
    .returning();
  return { service: service!, slot: slot! };
}

describe('orders schema', () => {
  it('stores an order with snapshotted contact details and a status event', async () => {
    const db = getDb(env.DB);
    const { service, slot } = await seedService(db);

    const [order] = await db
      .insert(schema.orders)
      .values({
        code: 'SX-000001',
        userId: 'user_abc',
        serviceId: service.id,
        comboKey: '',
        basePrice: 1500,
        creditApplied: 0,
        total: 1500,
        scheduledDate: '2026-08-05',
        slotId: slot.id,
        nameSnapshot: 'Rafiq Hasan',
        phoneSnapshot: '+8801711000000',
        addressSnapshot: 'House 12, Road 4, Dhanmondi',
        status: 'PENDING',
      })
      .returning();

    await db
      .insert(schema.orderEvents)
      .values({ orderId: order!.id, status: 'PENDING', note: 'Order placed' });

    const events = await db
      .select()
      .from(schema.orderEvents)
      .where(eq(schema.orderEvents.orderId, order!.id));

    expect(events).toHaveLength(1);
    expect(events[0]!.status).toBe('PENDING');
    expect(order!.total).toBe(1500);
  });

  it('rejects a duplicate order code', async () => {
    const db = getDb(env.DB);
    const { service, slot } = await seedService(db);

    const base = {
      userId: 'user_abc',
      serviceId: service.id,
      comboKey: '',
      basePrice: 1000,
      creditApplied: 0,
      total: 1000,
      scheduledDate: '2026-08-06',
      slotId: slot.id,
      nameSnapshot: 'A',
      phoneSnapshot: '1',
      addressSnapshot: 'x',
      status: 'PENDING' as const,
    };

    await db.insert(schema.orders).values({ ...base, code: 'SX-000002' });
    await expect(db.insert(schema.orders).values({ ...base, code: 'SX-000002' })).rejects.toThrow();
  });

  it('exposes the full status list', () => {
    expect(ORDER_STATUSES).toEqual([
      'PENDING',
      'APPROVED',
      'ON_THE_WAY',
      'IN_PROGRESS',
      'COMPLETED',
      'CANCELLED',
    ]);
  });
});
