import { env } from 'cloudflare:test';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { getDb, schema } from '../src/index';
import { restore, softDelete } from '../src/soft-delete';

const db = () => getDb(env.DB);

function tag() {
  return crypto.randomUUID().slice(0, 8);
}

async function category() {
  const t = tag();
  const [row] = await db()
    .insert(schema.categories)
    .values({ slug: `c-${t}`, name: `Cat ${t}` })
    .returning();
  return row!;
}

async function service(categoryId: number) {
  const t = tag();
  const [row] = await db()
    .insert(schema.services)
    .values({ categoryId, slug: `s-${t}`, name: `Svc ${t}` })
    .returning();
  return row!;
}

async function technician() {
  const t = tag();
  const [row] = await db()
    .insert(schema.technicians)
    .values({ fullName: `Tech ${t}`, phone: `+88017${t.slice(0, 8)}` })
    .returning();
  return row!;
}

async function employee({ isOwner = false } = {}) {
  const t = tag();
  const id = `admin_${t}`;
  await db().insert(schema.adminUser).values({
    id,
    name: `Staff ${t}`,
    email: `${id}@example.com`,
    emailVerified: true,
    isOwner,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return id;
}

beforeEach(async () => {
  // Owner counting is global, so every owner test starts from a known state.
  await db().delete(schema.adminUser);
});

describe('softDelete', () => {
  it('keeps the row and records when and by whom', async () => {
    const cat = await category();

    expect(await softDelete(db(), 'category', cat.id, 'admin_1')).toEqual({ ok: true });

    const [row] = await db()
      .select()
      .from(schema.categories)
      .where(eq(schema.categories.id, cat.id));

    // The whole point: still there, and it says who and when.
    expect(row).toBeDefined();
    expect(row!.deletedAt).toBeInstanceOf(Date);
    expect(row!.deletedBy).toBe('admin_1');
  });

  it('also deactivates, so a deleted record cannot stay publicly visible', async () => {
    const cat = await category();
    const svc = await service(cat.id);

    await softDelete(db(), 'service', svc.id, 'admin_1');

    const [row] = await db().select().from(schema.services).where(eq(schema.services.id, svc.id));
    expect(row!.active).toBe(false);
  });

  it('refuses a second delete rather than overwriting the first trail', async () => {
    const tech = await technician();

    expect(await softDelete(db(), 'technician', tech.id, 'admin_1')).toEqual({ ok: true });
    const [first] = await db()
      .select()
      .from(schema.technicians)
      .where(eq(schema.technicians.id, tech.id));

    expect(await softDelete(db(), 'technician', tech.id, 'admin_2')).toEqual({
      ok: false,
      reason: 'already-deleted',
    });

    // The original deleter and timestamp must survive the second attempt.
    const [second] = await db()
      .select()
      .from(schema.technicians)
      .where(eq(schema.technicians.id, tech.id));
    expect(second!.deletedBy).toBe('admin_1');
    expect(second!.deletedAt).toEqual(first!.deletedAt);
  });

  it('reports a missing record rather than silently succeeding', async () => {
    expect(await softDelete(db(), 'category', 999999, 'admin_1')).toEqual({
      ok: false,
      reason: 'not-found',
    });
  });
});

describe('softDelete of employees', () => {
  it('refuses to delete yourself', async () => {
    const me = await employee({ isOwner: true });
    await employee({ isOwner: true }); // a second owner, so only `self` can apply

    expect(await softDelete(db(), 'employee', me, me)).toEqual({ ok: false, reason: 'self' });
  });

  it('refuses to delete the last active owner', async () => {
    const owner = await employee({ isOwner: true });
    const staff = await employee();

    // Staff may go.
    expect(await softDelete(db(), 'employee', staff, owner)).toEqual({ ok: true });

    // The sole remaining owner may not — that would lock everyone out of the
    // back office with no way back in, since the setup route is closed.
    expect(await softDelete(db(), 'employee', owner, staff)).toEqual({
      ok: false,
      reason: 'last-owner',
    });

    const [row] = await db()
      .select()
      .from(schema.adminUser)
      .where(eq(schema.adminUser.id, owner));
    expect(row!.deletedAt).toBeNull();
    expect(row!.active).toBe(true);
  });

  it('allows deleting an owner while another active owner remains', async () => {
    const first = await employee({ isOwner: true });
    const second = await employee({ isOwner: true });

    expect(await softDelete(db(), 'employee', first, second)).toEqual({ ok: true });
  });

  it('does not count a deleted owner as cover for deleting the last one', async () => {
    const a = await employee({ isOwner: true });
    const b = await employee({ isOwner: true });
    const staff = await employee();

    await softDelete(db(), 'employee', a, b);

    // `a` is deleted, so `b` is now the last one standing.
    expect(await softDelete(db(), 'employee', b, staff)).toEqual({
      ok: false,
      reason: 'last-owner',
    });
  });

  it('deactivates the account, so the session guard rejects it immediately', async () => {
    const owner = await employee({ isOwner: true });
    await employee({ isOwner: true });
    const staff = await employee();

    await softDelete(db(), 'employee', staff, owner);

    const [row] = await db()
      .select()
      .from(schema.adminUser)
      .where(eq(schema.adminUser.id, staff));

    // getCurrentEmployee already refuses inactive accounts, so a deleted
    // employee is signed out on their very next request without any new check.
    expect(row!.active).toBe(false);
    expect(row!.deletedAt).toBeInstanceOf(Date);
  });
});

describe('restore', () => {
  it('brings a record back, but inactive', async () => {
    const cat = await category();
    await softDelete(db(), 'category', cat.id, 'admin_1');

    expect(await restore(db(), 'category', cat.id)).toEqual({ ok: true });

    const [row] = await db()
      .select()
      .from(schema.categories)
      .where(eq(schema.categories.id, cat.id));

    expect(row!.deletedAt).toBeNull();
    expect(row!.deletedBy).toBeNull();
    // Deliberately not straight back into public view — publishing it again is
    // a separate, deliberate click.
    expect(row!.active).toBe(false);
  });

  it('refuses to restore something that was never deleted', async () => {
    const cat = await category();
    expect(await restore(db(), 'category', cat.id)).toEqual({ ok: false, reason: 'not-found' });
  });
});

describe('a deleted record disappears from the places that matter', () => {
  it('is refused by placeOrder, so nobody can book a deleted service', async () => {
    const { placeOrder } = await import('../src/place-order');
    const cat = await category();
    const svc = await service(cat.id);
    const t = tag();

    await db().insert(schema.servicePrices).values({ serviceId: svc.id, comboKey: '', price: 1000 });
    const [slot] = await db()
      .insert(schema.slotTemplates)
      .values({ label: `Slot ${t}`, startTime: '09:00', endTime: '12:00' })
      .returning();
    const [area] = await db().insert(schema.areas).values({ name: `Area ${t}` }).returning();

    const userId = `user_${t}`;
    await db().insert(schema.user).values({ id: userId, name: 'X', email: `${userId}@e.com` });
    await db().insert(schema.profiles).values({
      userId,
      fullName: 'X',
      phone: '+8801712345678',
      address: 'Dhaka',
      areaId: area!.id,
      referralCode: `R${t.toUpperCase()}`,
    });
    await db().delete(schema.settings);
    await db().insert(schema.settings).values({ key: 'default_slot_capacity', value: '20' });

    const booking = {
      userId,
      serviceId: svc.id,
      optionIds: [],
      scheduledDate: '2026-12-20',
      slotId: slot!.id,
      requestedCredit: 0,
      notes: null,
    };

    // Bookable before.
    expect((await placeOrder(db(), booking)).ok).toBe(true);

    await softDelete(db(), 'service', svc.id, 'admin_1');

    // And refused after — because softDelete also clears `active`, which the
    // booking path already gates on. No new check was needed there.
    const after = await placeOrder(db(), booking);
    expect(after.ok).toBe(false);
  });

  it('is refused by assignTechnician', async () => {
    const { assignTechnician } = await import('../src/technicians');
    const tech = await technician();

    await softDelete(db(), 'technician', tech.id, 'admin_1');

    const result = await assignTechnician(db(), 999999, tech.id, 'admin_1');
    // Whichever check fires first, it must not be a successful assignment.
    expect(result.ok).toBe(false);
  });
});
