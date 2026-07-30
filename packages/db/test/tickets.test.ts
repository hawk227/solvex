import { env } from 'cloudflare:test';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { getDb, schema } from '../src/index';
import {
  countOpenTickets,
  generateTicketRef,
  getCustomerTicketMessages,
  getStaffTicketMessages,
  listCustomerTickets,
  openTicket,
  replyAsCustomer,
  replyAsStaff,
  setTicketStatus,
} from '../src/tickets';
import { placeOrder } from '../src/place-order';

async function customer(db: ReturnType<typeof getDb>, name = 'Rafiq Hasan') {
  const tag = crypto.randomUUID().slice(0, 8);
  const id = `user_${tag}`;
  await db.insert(schema.user).values({ id, name, email: `${id}@example.com` });
  const [area] = await db.insert(schema.areas).values({ name: `Area ${tag}` }).returning();
  await db.insert(schema.profiles).values({
    userId: id,
    fullName: name,
    phone: '+8801712345678',
    address: 'House 1, Dhaka',
    areaId: area!.id,
    referralCode: `T${tag.toUpperCase()}`,
  });
  return { id, name, areaId: area!.id };
}

async function orderFor(db: ReturnType<typeof getDb>, userId: string) {
  const tag = crypto.randomUUID().slice(0, 8);
  const [category] = await db
    .insert(schema.categories)
    .values({ slug: `c-${tag}`, name: 'C' })
    .returning();
  const [service] = await db
    .insert(schema.services)
    .values({ categoryId: category!.id, slug: `s-${tag}`, name: 'S' })
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
    scheduledDate: '2026-12-20',
    slotId: slot!.id,
    requestedCredit: 0,
    notes: null,
  });
  if (!placed.ok) throw new Error(`order failed: ${placed.reason}`);
  return placed.orderId;
}

beforeEach(async () => {
  const db = getDb(env.DB);
  await db.delete(schema.settings);
  await db.insert(schema.settings).values({ key: 'default_slot_capacity', value: '20' });
});

describe('generateTicketRef', () => {
  it('is prefixed and avoids ambiguous characters', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateTicketRef()).toMatch(/^TK-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    }
  });
});

describe('openTicket', () => {
  it('creates a ticket with its first message', async () => {
    const db = getDb(env.DB);
    const c = await customer(db);

    const result = await openTicket(db, {
      userId: c.id,
      subject: 'AC still not cooling',
      topic: 'TECHNICIAN',
      body: 'The technician left but it is still warm.',
      orderId: null,
      authorName: c.name,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const messages = await getCustomerTicketMessages(db, c.id, result.ref);
    expect(messages).toHaveLength(1);
    expect(messages![0]).toMatchObject({
      authorType: 'CUSTOMER',
      body: 'The technician left but it is still warm.',
    });
  });

  it('accepts an order that belongs to the customer', async () => {
    const db = getDb(env.DB);
    const c = await customer(db);
    const orderId = await orderFor(db, c.id);

    const result = await openTicket(db, {
      userId: c.id,
      subject: 'About my booking',
      topic: 'BOOKING',
      body: 'Can I move it?',
      orderId,
      authorName: c.name,
    });

    expect(result.ok).toBe(true);
  });

  it('refuses an order belonging to someone else', async () => {
    const db = getDb(env.DB);
    const mine = await customer(db, 'Mine');
    const theirs = await customer(db, 'Theirs');
    const theirOrder = await orderFor(db, theirs.id);

    // Attaching another customer's booking would expose their address and phone
    // in the staff view beside this ticket.
    expect(
      await openTicket(db, {
        userId: mine.id,
        subject: 'Prying',
        topic: 'BOOKING',
        body: 'Whose is this?',
        orderId: theirOrder,
        authorName: mine.name,
      }),
    ).toEqual({ ok: false, reason: 'order-not-yours' });

    // Scoped to this customer: other tests in this file leave tickets behind.
    expect(await listCustomerTickets(db, mine.id)).toHaveLength(0);
  });
});

describe('internal notes', () => {
  it('are never returned to the customer', async () => {
    const db = getDb(env.DB);
    const c = await customer(db);
    const opened = await openTicket(db, {
      userId: c.id,
      subject: 'Refund please',
      topic: 'BILLING',
      body: 'I want a refund.',
      orderId: null,
      authorName: c.name,
    });
    if (!opened.ok) throw new Error('expected success');

    await replyAsStaff(db, opened.id, 'admin_1', 'Ashfaque', 'Looking into it now.', false);
    await replyAsStaff(
      db,
      opened.id,
      'admin_1',
      'Ashfaque',
      'This customer has complained twice before — do not refund.',
      true,
    );

    const customerView = await getCustomerTicketMessages(db, c.id, opened.ref);
    const staffView = await getStaffTicketMessages(db, opened.id);

    expect(customerView).toHaveLength(2);
    expect(customerView!.map((m) => m.body)).toEqual([
      'I want a refund.',
      'Looking into it now.',
    ]);
    // The damaging line must appear nowhere in what the customer can read.
    expect(JSON.stringify(customerView)).not.toContain('complained twice');

    expect(staffView).toHaveLength(3);
    expect(staffView.some((m) => m.internal)).toBe(true);
  });

  it('do not mark the ticket as answered', async () => {
    const db = getDb(env.DB);
    const c = await customer(db);
    const opened = await openTicket(db, {
      userId: c.id,
      subject: 'Hello',
      topic: 'OTHER',
      body: 'Question',
      orderId: null,
      authorName: c.name,
    });
    if (!opened.ok) throw new Error('expected success');

    await replyAsStaff(db, opened.id, 'admin_1', 'Staff', 'Note to self', true);
    let [ticket] = await db.select().from(schema.tickets).where(eq(schema.tickets.id, opened.id));
    expect(ticket!.status).toBe('OPEN');

    await replyAsStaff(db, opened.id, 'admin_1', 'Staff', 'Here is your answer', false);
    [ticket] = await db.select().from(schema.tickets).where(eq(schema.tickets.id, opened.id));
    expect(ticket!.status).toBe('ANSWERED');
  });
});

describe('customer access is scoped', () => {
  it('will not show one customer another customer’s ticket', async () => {
    const db = getDb(env.DB);
    const mine = await customer(db, 'Mine');
    const theirs = await customer(db, 'Theirs');

    const opened = await openTicket(db, {
      userId: theirs.id,
      subject: 'Private',
      topic: 'OTHER',
      body: 'Sensitive detail',
      orderId: null,
      authorName: theirs.name,
    });
    if (!opened.ok) throw new Error('expected success');

    // Even knowing the exact reference.
    expect(await getCustomerTicketMessages(db, mine.id, opened.ref)).toBeNull();
    expect(await listCustomerTickets(db, mine.id)).toHaveLength(0);
  });

  it('will not let one customer reply to another’s ticket', async () => {
    const db = getDb(env.DB);
    const mine = await customer(db, 'Mine');
    const theirs = await customer(db, 'Theirs');

    const opened = await openTicket(db, {
      userId: theirs.id,
      subject: 'Private',
      topic: 'OTHER',
      body: 'Sensitive',
      orderId: null,
      authorName: theirs.name,
    });
    if (!opened.ok) throw new Error('expected success');

    expect(await replyAsCustomer(db, mine.id, opened.ref, 'butting in', mine.name)).toEqual({
      ok: false,
      reason: 'not-found',
    });

    const staffView = await getStaffTicketMessages(db, opened.id);
    expect(staffView).toHaveLength(1);
  });
});

describe('replies and status', () => {
  it('a customer reply reopens a resolved ticket', async () => {
    const db = getDb(env.DB);
    const c = await customer(db);
    const opened = await openTicket(db, {
      userId: c.id,
      subject: 'Still broken',
      topic: 'TECHNICIAN',
      body: 'Not fixed',
      orderId: null,
      authorName: c.name,
    });
    if (!opened.ok) throw new Error('expected success');

    await setTicketStatus(db, opened.id, 'RESOLVED', 'admin_1', 'Staff');
    expect(await replyAsCustomer(db, c.id, opened.ref, 'It broke again', c.name)).toEqual({
      ok: true,
    });

    const [ticket] = await db
      .select()
      .from(schema.tickets)
      .where(eq(schema.tickets.id, opened.id));
    expect(ticket!.status).toBe('OPEN');
  });

  it('refuses a customer reply on a closed ticket', async () => {
    const db = getDb(env.DB);
    const c = await customer(db);
    const opened = await openTicket(db, {
      userId: c.id,
      subject: 'Done',
      topic: 'OTHER',
      body: 'Thanks',
      orderId: null,
      authorName: c.name,
    });
    if (!opened.ok) throw new Error('expected success');

    await setTicketStatus(db, opened.id, 'CLOSED', 'admin_1', 'Staff');
    expect(await replyAsCustomer(db, c.id, opened.ref, 'one more thing', c.name)).toEqual({
      ok: false,
      reason: 'closed',
    });
  });

  it('records a status change as an internal note, not a customer-visible one', async () => {
    const db = getDb(env.DB);
    const c = await customer(db);
    const opened = await openTicket(db, {
      userId: c.id,
      subject: 'Subject',
      topic: 'OTHER',
      body: 'Body',
      orderId: null,
      authorName: c.name,
    });
    if (!opened.ok) throw new Error('expected success');

    await setTicketStatus(db, opened.id, 'RESOLVED', 'admin_1', 'Staff');

    const customerView = await getCustomerTicketMessages(db, c.id, opened.ref);
    expect(customerView).toHaveLength(1);
    expect(JSON.stringify(customerView)).not.toContain('Status changed');
  });
});

describe('countOpenTickets', () => {
  it('counts only work still needing attention', async () => {
    const db = getDb(env.DB);
    await db.delete(schema.tickets);
    const c = await customer(db);

    const make = async (subject: string) => {
      const r = await openTicket(db, {
        userId: c.id,
        subject,
        topic: 'OTHER',
        body: 'x',
        orderId: null,
        authorName: c.name,
      });
      if (!r.ok) throw new Error('expected success');
      return r.id;
    };

    const a = await make('one');
    const b = await make('two');
    const d = await make('three');

    expect(await countOpenTickets(db)).toBe(3);

    await replyAsStaff(db, a, 'admin_1', 'Staff', 'answered', false); // ANSWERED still counts
    expect(await countOpenTickets(db)).toBe(3);

    await setTicketStatus(db, b, 'RESOLVED', 'admin_1', 'Staff');
    await setTicketStatus(db, d, 'CLOSED', 'admin_1', 'Staff');
    expect(await countOpenTickets(db)).toBe(1);
  });
});
