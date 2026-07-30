import { env } from 'cloudflare:test';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { getDb, schema } from '../src/index';
import {
  assignTechnician,
  getTechnicianOptions,
  setTechnicianCoverage,
} from '../src/technicians';
import { placeOrder } from '../src/place-order';

const DATE = '2026-12-05';

async function tech(db: ReturnType<typeof getDb>, name: string, active = true) {
  const tag = crypto.randomUUID().slice(0, 8);
  const [row] = await db
    .insert(schema.technicians)
    .values({ fullName: name, phone: `+88017${tag.replace(/\D/g, '0').slice(0, 8).padEnd(8, '0')}`, active })
    .returning();
  return row!;
}

async function world() {
  const db = getDb(env.DB);
  const tag = crypto.randomUUID().slice(0, 8);

  const userId = `user_${tag}`;
  await db
    .insert(schema.user)
    .values({ id: userId, name: 'C', email: `${userId}@example.com` });

  const [area] = await db.insert(schema.areas).values({ name: `Area ${tag}` }).returning();
  await db.insert(schema.profiles).values({
    userId,
    fullName: 'Rafiq Hasan',
    phone: '+8801712345678',
    address: 'House 1',
    areaId: area!.id,
    referralCode: `T${tag.toUpperCase()}`,
  });

  const [category] = await db
    .insert(schema.categories)
    .values({ slug: `cat-${tag}`, name: 'Cat' })
    .returning();
  const [service] = await db
    .insert(schema.services)
    .values({ categoryId: category!.id, slug: `svc-${tag}`, name: 'Svc' })
    .returning();
  await db.insert(schema.servicePrices).values({ serviceId: service!.id, comboKey: '', price: 1000 });
  const [slot] = await db
    .insert(schema.slotTemplates)
    .values({ label: `Slot ${tag}`, startTime: '09:00', endTime: '12:00' })
    .returning();

  const placed = await placeOrder(db, {
    userId,
    serviceId: service!.id,
    optionIds: [],
    scheduledDate: DATE,
    slotId: slot!.id,
    requestedCredit: 0,
    notes: null,
  });
  if (!placed.ok) throw new Error(`order failed: ${placed.reason}`);

  return { db, userId, area: area!, category: category!, orderId: placed.orderId };
}

beforeEach(async () => {
  const db = getDb(env.DB);
  await db.delete(schema.settings);
  await db.insert(schema.settings).values({ key: 'default_slot_capacity', value: '20' });
});

describe('assignTechnician', () => {
  it('assigns an active technician and records it on the timeline', async () => {
    const w = await world();
    const t = await tech(w.db, 'Karim the Cooler Guy');

    const result = await assignTechnician(w.db, w.orderId, t.id, 'admin_1');
    expect(result).toEqual({ ok: true, technicianName: 'Karim the Cooler Guy' });

    const [order] = await w.db
      .select({ technicianId: schema.orders.technicianId })
      .from(schema.orders)
      .where(eq(schema.orders.id, w.orderId));
    expect(order!.technicianId).toBe(t.id);

    const events = await w.db
      .select()
      .from(schema.orderEvents)
      .where(eq(schema.orderEvents.orderId, w.orderId));
    expect(events.some((e) => e.note?.includes('Karim the Cooler Guy'))).toBe(true);
  });

  it('refuses an inactive technician', async () => {
    const w = await world();
    const t = await tech(w.db, 'Retired Rahim', false);

    expect(await assignTechnician(w.db, w.orderId, t.id)).toEqual({
      ok: false,
      reason: 'technician-inactive',
    });

    const [order] = await w.db
      .select({ technicianId: schema.orders.technicianId })
      .from(schema.orders)
      .where(eq(schema.orders.id, w.orderId));
    expect(order!.technicianId).toBeNull();
  });

  it('refuses a technician that does not exist', async () => {
    const w = await world();
    expect(await assignTechnician(w.db, w.orderId, 999999)).toEqual({
      ok: false,
      reason: 'technician-not-found',
    });
  });

  it('clears an assignment when passed null', async () => {
    const w = await world();
    const t = await tech(w.db, 'Someone');

    await assignTechnician(w.db, w.orderId, t.id);
    expect(await assignTechnician(w.db, w.orderId, null)).toEqual({
      ok: true,
      technicianName: null,
    });

    const [order] = await w.db
      .select({ technicianId: schema.orders.technicianId })
      .from(schema.orders)
      .where(eq(schema.orders.id, w.orderId));
    expect(order!.technicianId).toBeNull();
  });

  it('does not write a duplicate event when re-assigning the same person', async () => {
    const w = await world();
    const t = await tech(w.db, 'Same Person');

    await assignTechnician(w.db, w.orderId, t.id);
    const afterFirst = await w.db
      .select()
      .from(schema.orderEvents)
      .where(eq(schema.orderEvents.orderId, w.orderId));

    await assignTechnician(w.db, w.orderId, t.id);
    const afterSecond = await w.db
      .select()
      .from(schema.orderEvents)
      .where(eq(schema.orderEvents.orderId, w.orderId));

    expect(afterSecond.length).toBe(afterFirst.length);
  });

  it('refuses to assign to a completed or cancelled order', async () => {
    const w = await world();
    const t = await tech(w.db, 'Too Late');

    await w.db
      .update(schema.orders)
      .set({ status: 'COMPLETED' })
      .where(eq(schema.orders.id, w.orderId));
    expect(await assignTechnician(w.db, w.orderId, t.id)).toEqual({
      ok: false,
      reason: 'order-closed',
    });

    await w.db
      .update(schema.orders)
      .set({ status: 'CANCELLED' })
      .where(eq(schema.orders.id, w.orderId));
    expect(await assignTechnician(w.db, w.orderId, t.id)).toEqual({
      ok: false,
      reason: 'order-closed',
    });
  });

  it('keeps the assignment readable after the order completes', async () => {
    const w = await world();
    const t = await tech(w.db, 'Finished The Job');

    await assignTechnician(w.db, w.orderId, t.id);
    await w.db
      .update(schema.orders)
      .set({ status: 'COMPLETED' })
      .where(eq(schema.orders.id, w.orderId));

    const [order] = await w.db
      .select({ technicianId: schema.orders.technicianId })
      .from(schema.orders)
      .where(eq(schema.orders.id, w.orderId));
    expect(order!.technicianId).toBe(t.id);
  });

  it('refuses to delete a technician who has been assigned to an order', async () => {
    const w = await world();
    const t = await tech(w.db, 'Departed');
    await assignTechnician(w.db, w.orderId, t.id);

    // The live constraint is NO ACTION (see the note on orders.technicianId), so
    // the delete is rejected. That protects the record of who attended the job —
    // take someone off the rota with `active = false` instead.
    await expect(
      w.db.delete(schema.technicians).where(eq(schema.technicians.id, t.id)),
    ).rejects.toThrow();

    const [order] = await w.db
      .select({ technicianId: schema.orders.technicianId })
      .from(schema.orders)
      .where(eq(schema.orders.id, w.orderId));
    expect(order!.technicianId).toBe(t.id);
  });

  it('allows deleting a technician who was never assigned', async () => {
    const w = await world();
    const t = await tech(w.db, 'Never Dispatched');

    await w.db.delete(schema.technicians).where(eq(schema.technicians.id, t.id));

    const left = await w.db
      .select()
      .from(schema.technicians)
      .where(eq(schema.technicians.id, t.id));
    expect(left).toHaveLength(0);
  });
});

describe('getTechnicianOptions', () => {
  it('excludes inactive technicians', async () => {
    const w = await world();
    const on = await tech(w.db, 'Available Amin');
    await tech(w.db, 'Inactive Imran', false);

    const options = await getTechnicianOptions(w.db, { areaId: w.area.id, categoryId: w.category.id });
    const ids = options.map((o) => o.id);

    expect(ids).toContain(on.id);
    expect(options.every((o) => o.fullName !== 'Inactive Imran')).toBe(true);
  });

  it('flags who covers the area and holds the skill', async () => {
    const w = await world();
    const matching = await tech(w.db, 'Perfect Fit');
    const other = await tech(w.db, 'Wrong Patch');

    await setTechnicianCoverage(w.db, matching.id, [w.category.id], [w.area.id]);
    await setTechnicianCoverage(w.db, other.id, [], []);

    const options = await getTechnicianOptions(w.db, {
      areaId: w.area.id,
      categoryId: w.category.id,
    });
    const fit = options.find((o) => o.id === matching.id)!;
    const miss = options.find((o) => o.id === other.id)!;

    expect(fit).toMatchObject({ coversArea: true, hasSkill: true });
    expect(miss).toMatchObject({ coversArea: false, hasSkill: false });

    // Best fit is offered first.
    expect(options[0]!.id).toBe(matching.id);
  });

  it('counts only open jobs as load', async () => {
    const w = await world();
    const t = await tech(w.db, 'Busy Bashir');
    await assignTechnician(w.db, w.orderId, t.id);

    let options = await getTechnicianOptions(w.db, { areaId: null, categoryId: null });
    expect(options.find((o) => o.id === t.id)!.openJobs).toBe(1);

    // Finishing the job frees them up.
    await w.db
      .update(schema.orders)
      .set({ status: 'COMPLETED' })
      .where(eq(schema.orders.id, w.orderId));

    options = await getTechnicianOptions(w.db, { areaId: null, categoryId: null });
    expect(options.find((o) => o.id === t.id)!.openJobs).toBe(0);
  });
});

describe('setTechnicianCoverage', () => {
  it('replaces rather than appends', async () => {
    const w = await world();
    const t = await tech(w.db, 'Changing Skills');

    await setTechnicianCoverage(w.db, t.id, [w.category.id], [w.area.id]);
    await setTechnicianCoverage(w.db, t.id, [], []);

    const skills = await w.db
      .select()
      .from(schema.technicianSkills)
      .where(eq(schema.technicianSkills.technicianId, t.id));
    const areas = await w.db
      .select()
      .from(schema.technicianAreas)
      .where(eq(schema.technicianAreas.technicianId, t.id));

    expect(skills).toHaveLength(0);
    expect(areas).toHaveLength(0);
  });
});
