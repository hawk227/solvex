import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import { getDb, schema } from '../src/index';
import {
  getAreaUsage,
  getCategoryBreakdown,
  getCustomerGrowth,
  getKpis,
  getOrdersByDay,
  getServiceBreakdown,
  getSlotUsage,
} from '../src/analytics';

/** Today as a Dhaka date, matching how the queries bucket days. */
function today(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
}

async function reset(db: ReturnType<typeof getDb>) {
  // Analytics are whole-table aggregates, so each test needs a clean slate.
  await db.delete(schema.orderEvents);
  await db.delete(schema.creditLedger);
  await db.delete(schema.referrals);
  await db.delete(schema.orders);
  await db.delete(schema.profiles);
  await db.delete(schema.servicePrices);
  await db.delete(schema.variableOptions);
  await db.delete(schema.variableGroups);
  await db.delete(schema.services);
  await db.delete(schema.categories);
  await db.delete(schema.slotCapacity);
  await db.delete(schema.slotTemplates);
  await db.delete(schema.areas);
  await db.delete(schema.user);
}

/**
 * A fixed scenario used by most tests:
 *   AC / Cleaning     — one COMPLETED at 1500, one PENDING at 1500
 *   AC / Checkup      — one CANCELLED at 800
 *   Fridge / Repair   — one COMPLETED at 2000, with 500 credit applied
 */
async function scenario(db: ReturnType<typeof getDb>) {
  const [ac] = await db.insert(schema.categories).values({ slug: 'ac', name: 'AC' }).returning();
  const [fridge] = await db
    .insert(schema.categories)
    .values({ slug: 'fridge', name: 'Fridge' })
    .returning();

  const [cleaning] = await db
    .insert(schema.services)
    .values({ categoryId: ac!.id, slug: 'cleaning', name: 'Cleaning' })
    .returning();
  const [checkup] = await db
    .insert(schema.services)
    .values({ categoryId: ac!.id, slug: 'checkup', name: 'Checkup' })
    .returning();
  const [repair] = await db
    .insert(schema.services)
    .values({ categoryId: fridge!.id, slug: 'repair', name: 'Repair' })
    .returning();

  const [morning] = await db
    .insert(schema.slotTemplates)
    .values({ label: 'Morning', startTime: '09:00', endTime: '12:00', sort: 1 })
    .returning();
  const [evening] = await db
    .insert(schema.slotTemplates)
    .values({ label: 'Evening', startTime: '15:00', endTime: '18:00', sort: 2 })
    .returning();

  const [dhanmondi] = await db
    .insert(schema.areas)
    .values({ name: 'Dhanmondi' })
    .returning();
  const [banani] = await db.insert(schema.areas).values({ name: 'Banani' }).returning();

  await db
    .insert(schema.user)
    .values({ id: 'u1', name: 'One', email: 'one@example.com' });
  await db
    .insert(schema.user)
    .values({ id: 'u2', name: 'Two', email: 'two@example.com' });

  await db.insert(schema.profiles).values([
    {
      userId: 'u1',
      fullName: 'One',
      phone: '+8801712345678',
      address: 'A',
      areaId: dhanmondi!.id,
      referralCode: 'ONE',
    },
    {
      userId: 'u2',
      fullName: 'Two',
      phone: '+8801812345678',
      address: 'B',
      areaId: banani!.id,
      referralCode: 'TWO',
    },
  ]);

  const base = {
    comboKey: '',
    scheduledDate: today(),
    nameSnapshot: 'X',
    phoneSnapshot: '+8801700000000',
    addressSnapshot: 'Y',
  };

  await db.insert(schema.orders).values([
    {
      ...base,
      code: 'SX-A',
      userId: 'u1',
      serviceId: cleaning!.id,
      slotId: morning!.id,
      areaId: dhanmondi!.id,
      basePrice: 1500,
      creditApplied: 0,
      total: 1500,
      status: 'COMPLETED',
    },
    {
      ...base,
      code: 'SX-B',
      userId: 'u2',
      serviceId: cleaning!.id,
      slotId: morning!.id,
      areaId: dhanmondi!.id,
      basePrice: 1500,
      creditApplied: 0,
      total: 1500,
      status: 'PENDING',
    },
    {
      ...base,
      code: 'SX-C',
      userId: 'u1',
      serviceId: checkup!.id,
      slotId: evening!.id,
      areaId: banani!.id,
      basePrice: 800,
      creditApplied: 0,
      total: 800,
      status: 'CANCELLED',
    },
    {
      ...base,
      code: 'SX-D',
      userId: 'u2',
      serviceId: repair!.id,
      slotId: evening!.id,
      areaId: banani!.id,
      basePrice: 2500,
      creditApplied: 500,
      total: 2000,
      status: 'COMPLETED',
    },
  ]);
}

beforeEach(async () => {
  const db = getDb(env.DB);
  await reset(db);
});

describe('getKpis', () => {
  it('counts revenue from COMPLETED orders only', async () => {
    const db = getDb(env.DB);
    await scenario(db);

    const kpis = await getKpis(db);

    expect(kpis).toMatchObject({
      ordersTotal: 4,
      ordersPending: 1,
      ordersCompleted: 2,
      ordersCancelled: 1,
      // 1500 + 2000. The PENDING 1500 and CANCELLED 800 are excluded.
      revenue: 3500,
      creditRedeemed: 500,
      customers: 2,
    });
  });

  it('averages over completed orders and rounds to whole taka', async () => {
    const db = getDb(env.DB);
    await scenario(db);
    // 3500 / 2 = 1750 exactly.
    expect((await getKpis(db)).averageOrderValue).toBe(1750);
  });

  it('reports zeros on an empty database rather than dividing by zero', async () => {
    const db = getDb(env.DB);
    const kpis = await getKpis(db);
    expect(kpis).toEqual({
      ordersTotal: 0,
      ordersPending: 0,
      ordersCompleted: 0,
      ordersCancelled: 0,
      revenue: 0,
      creditRedeemed: 0,
      customers: 0,
      averageOrderValue: 0,
    });
    expect(Number.isNaN(kpis.averageOrderValue)).toBe(false);
  });
});

describe('getOrdersByDay', () => {
  it('fills days with no orders as zeros so a quiet week is not hidden', async () => {
    const db = getDb(env.DB);
    await scenario(db);

    const series = await getOrdersByDay(db, 7);

    expect(series).toHaveLength(7);
    // Oldest first, ending today.
    expect(series[6]!.date).toBe(today());
    // Today: 3 non-cancelled orders, 3500 completed revenue.
    expect(series[6]).toMatchObject({ orders: 3, revenue: 3500 });
    // Every earlier day is empty but present.
    for (const point of series.slice(0, 6)) {
      expect(point).toMatchObject({ orders: 0, revenue: 0 });
    }
  });

  it('excludes cancelled orders from the order count', async () => {
    const db = getDb(env.DB);
    await scenario(db);
    const series = await getOrdersByDay(db, 1);
    // 4 orders exist; 1 is cancelled.
    expect(series[0]!.orders).toBe(3);
  });
});

describe('breakdowns', () => {
  it('groups by service, ordered by volume, excluding cancelled', async () => {
    const db = getDb(env.DB);
    await scenario(db);

    const rows = await getServiceBreakdown(db);

    // Checkup only had a cancelled order, so it is absent.
    expect(rows.map((r) => r.name)).toEqual(['Cleaning', 'Repair']);
    expect(rows[0]).toMatchObject({ name: 'Cleaning', orders: 2, revenue: 1500 });
    expect(rows[1]).toMatchObject({ name: 'Repair', orders: 1, revenue: 2000 });
  });

  it('groups by category', async () => {
    const db = getDb(env.DB);
    await scenario(db);

    const rows = await getCategoryBreakdown(db);
    const byName = new Map(rows.map((r) => [r.name, r]));

    expect(byName.get('AC')).toMatchObject({ orders: 2, revenue: 1500 });
    expect(byName.get('Fridge')).toMatchObject({ orders: 1, revenue: 2000 });
  });

  it('service revenue sums to total revenue', async () => {
    const db = getDb(env.DB);
    await scenario(db);

    const [kpis, services] = await Promise.all([getKpis(db), getServiceBreakdown(db)]);
    expect(services.reduce((sum, r) => sum + r.revenue, 0)).toBe(kpis.revenue);
  });
});

describe('getSlotUsage', () => {
  it('includes slots with no bookings', async () => {
    const db = getDb(env.DB);
    await scenario(db);

    const rows = await getSlotUsage(db);
    const byLabel = new Map(rows.map((r) => [r.label, r.orders]));

    expect(byLabel.get('Morning')).toBe(2);
    // Evening had one cancelled and one completed, so only the completed counts.
    expect(byLabel.get('Evening')).toBe(1);
  });

  it('reports zero rather than omitting an unused slot', async () => {
    const db = getDb(env.DB);
    await db
      .insert(schema.slotTemplates)
      .values({ label: 'Unused', startTime: '06:00', endTime: '09:00' });

    const rows = await getSlotUsage(db);
    expect(rows).toEqual([{ label: 'Unused', orders: 0 }]);
  });
});

describe('getAreaUsage', () => {
  it('ranks areas by non-cancelled orders', async () => {
    const db = getDb(env.DB);
    await scenario(db);

    const rows = await getAreaUsage(db);
    const byName = new Map(rows.map((r) => [r.name, r.orders]));

    expect(byName.get('Dhanmondi')).toBe(2);
    expect(byName.get('Banani')).toBe(1);
  });
});

describe('getCustomerGrowth', () => {
  it('counts new profiles per day with gaps filled', async () => {
    const db = getDb(env.DB);
    await scenario(db);

    const series = await getCustomerGrowth(db, 5);

    expect(series).toHaveLength(5);
    expect(series[4]!.date).toBe(today());
    expect(series[4]!.signups).toBe(2);
    expect(series.slice(0, 4).every((p) => p.signups === 0)).toBe(true);
  });
});
