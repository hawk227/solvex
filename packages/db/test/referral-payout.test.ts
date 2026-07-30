import { env } from 'cloudflare:test';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { getDb, schema } from '../src/index';
import { payReferralReward } from '../src/referral-payout';
import { getCreditBalance } from '../src/credit';
import { placeOrder } from '../src/place-order';
import { recordReferral } from '../src/referral';

const DATE = '2026-11-20';
const REWARD = 200;

async function customer(db: ReturnType<typeof getDb>, code: string) {
  const tag = crypto.randomUUID().slice(0, 8);
  const id = `user_${tag}`;
  await db
    .insert(schema.user)
    .values({ id, name: 'Customer', email: `${id}@example.com`, emailVerified: true });

  const [area] = await db.insert(schema.areas).values({ name: `Area ${tag}` }).returning();

  await db.insert(schema.profiles).values({
    userId: id,
    fullName: 'Customer Name',
    phone: '+8801712345678',
    address: 'House 1, Road 1, Dhaka',
    areaId: area!.id,
    referralCode: code,
  });
  return id;
}

async function service(db: ReturnType<typeof getDb>, price: number) {
  const tag = crypto.randomUUID().slice(0, 8);
  const [category] = await db
    .insert(schema.categories)
    .values({ slug: `cat-${tag}`, name: 'Cat' })
    .returning();
  const [svc] = await db
    .insert(schema.services)
    .values({ categoryId: category!.id, slug: `svc-${tag}`, name: 'Svc' })
    .returning();
  await db.insert(schema.servicePrices).values({ serviceId: svc!.id, comboKey: '', price });
  const [slot] = await db
    .insert(schema.slotTemplates)
    .values({ label: `Slot ${tag}`, startTime: '09:00', endTime: '12:00' })
    .returning();
  return { serviceId: svc!.id, slotId: slot!.id };
}

async function completedOrder(
  db: ReturnType<typeof getDb>,
  userId: string,
  svc: { serviceId: number; slotId: number },
) {
  const result = await placeOrder(db, {
    userId,
    serviceId: svc.serviceId,
    optionIds: [],
    scheduledDate: DATE,
    slotId: svc.slotId,
    requestedCredit: 0,
    notes: null,
  });
  if (!result.ok) throw new Error(`order failed: ${result.reason}`);
  await db
    .update(schema.orders)
    .set({ status: 'COMPLETED' })
    .where(eq(schema.orders.id, result.orderId));
  return result.orderId;
}

beforeEach(async () => {
  const db = getDb(env.DB);
  await db.delete(schema.settings);
  await db.insert(schema.settings).values([
    { key: 'default_slot_capacity', value: '20' },
    { key: 'referral_reward_taka', value: String(REWARD) },
  ]);
});

describe('payReferralReward', () => {
  it('credits the referrer when the referee completes their first order', async () => {
    const db = getDb(env.DB);
    const code = `A${crypto.randomUUID().slice(0, 7).toUpperCase()}`;
    const referrer = await customer(db, code);
    const referee = await customer(db, `B${crypto.randomUUID().slice(0, 7).toUpperCase()}`);
    await recordReferral(db, code, referee);

    const svc = await service(db, 1500);
    const orderId = await completedOrder(db, referee, svc);

    const result = await payReferralReward(db, orderId);

    expect(result).toEqual({ paid: true, referrerUserId: referrer, amount: REWARD });
    await expect(getCreditBalance(db, referrer)).resolves.toBe(REWARD);
    // The referee earns nothing for being referred.
    await expect(getCreditBalance(db, referee)).resolves.toBe(0);

    const [row] = await db
      .select()
      .from(schema.referrals)
      .where(eq(schema.referrals.refereeUserId, referee));
    expect(row).toMatchObject({ status: 'REWARDED', orderId });
  });

  it('pays only once when called repeatedly for the same order', async () => {
    const db = getDb(env.DB);
    const code = `C${crypto.randomUUID().slice(0, 7).toUpperCase()}`;
    const referrer = await customer(db, code);
    const referee = await customer(db, `D${crypto.randomUUID().slice(0, 7).toUpperCase()}`);
    await recordReferral(db, code, referee);

    const svc = await service(db, 1000);
    const orderId = await completedOrder(db, referee, svc);

    expect((await payReferralReward(db, orderId)).paid).toBe(true);
    expect(await payReferralReward(db, orderId)).toEqual({
      paid: false,
      reason: 'already-rewarded',
    });
    expect(await payReferralReward(db, orderId)).toEqual({
      paid: false,
      reason: 'already-rewarded',
    });

    await expect(getCreditBalance(db, referrer)).resolves.toBe(REWARD);
  });

  it('pays once when two callers complete at the same moment', async () => {
    const db = getDb(env.DB);
    const code = `E${crypto.randomUUID().slice(0, 7).toUpperCase()}`;
    const referrer = await customer(db, code);
    const referee = await customer(db, `F${crypto.randomUUID().slice(0, 7).toUpperCase()}`);
    await recordReferral(db, code, referee);

    const svc = await service(db, 1000);
    const orderId = await completedOrder(db, referee, svc);

    const results = await Promise.all([
      payReferralReward(db, orderId),
      payReferralReward(db, orderId),
      payReferralReward(db, orderId),
    ]);

    expect(results.filter((r) => r.paid)).toHaveLength(1);
    await expect(getCreditBalance(db, referrer)).resolves.toBe(REWARD);
  });

  it('does not pay again on the referee’s second completed order', async () => {
    const db = getDb(env.DB);
    const code = `G${crypto.randomUUID().slice(0, 7).toUpperCase()}`;
    const referrer = await customer(db, code);
    const referee = await customer(db, `H${crypto.randomUUID().slice(0, 7).toUpperCase()}`);
    await recordReferral(db, code, referee);

    const svc = await service(db, 1000);
    const first = await completedOrder(db, referee, svc);
    const second = await completedOrder(db, referee, svc);

    expect((await payReferralReward(db, first)).paid).toBe(true);
    expect(await payReferralReward(db, second)).toEqual({
      paid: false,
      reason: 'already-rewarded',
    });

    await expect(getCreditBalance(db, referrer)).resolves.toBe(REWARD);
  });

  it('does not pay for a customer who was never referred', async () => {
    const db = getDb(env.DB);
    const lone = await customer(db, `I${crypto.randomUUID().slice(0, 7).toUpperCase()}`);
    const svc = await service(db, 1000);
    const orderId = await completedOrder(db, lone, svc);

    expect(await payReferralReward(db, orderId)).toEqual({ paid: false, reason: 'no-referral' });
  });

  it('does not pay while the order is not COMPLETED', async () => {
    const db = getDb(env.DB);
    const code = `J${crypto.randomUUID().slice(0, 7).toUpperCase()}`;
    await customer(db, code);
    const referee = await customer(db, `K${crypto.randomUUID().slice(0, 7).toUpperCase()}`);
    await recordReferral(db, code, referee);

    const svc = await service(db, 1000);
    const placed = await placeOrder(db, {
      userId: referee,
      serviceId: svc.serviceId,
      optionIds: [],
      scheduledDate: DATE,
      slotId: svc.slotId,
      requestedCredit: 0,
      notes: null,
    });
    if (!placed.ok) throw new Error('expected success');

    // Still PENDING.
    expect((await payReferralReward(db, placed.orderId)).paid).toBe(false);

    // And a cancelled order never pays either.
    await db
      .update(schema.orders)
      .set({ status: 'CANCELLED' })
      .where(eq(schema.orders.id, placed.orderId));
    expect((await payReferralReward(db, placed.orderId)).paid).toBe(false);
  });

  it('refuses when no reward amount is configured', async () => {
    const db = getDb(env.DB);
    await db.delete(schema.settings).where(eq(schema.settings.key, 'referral_reward_taka'));

    const code = `L${crypto.randomUUID().slice(0, 7).toUpperCase()}`;
    const referrer = await customer(db, code);
    const referee = await customer(db, `M${crypto.randomUUID().slice(0, 7).toUpperCase()}`);
    await recordReferral(db, code, referee);

    const svc = await service(db, 1000);
    const orderId = await completedOrder(db, referee, svc);

    expect(await payReferralReward(db, orderId)).toEqual({
      paid: false,
      reason: 'no-reward-configured',
    });
    await expect(getCreditBalance(db, referrer)).resolves.toBe(0);

    // The referral stays PENDING so it can still be paid once configured.
    const [row] = await db
      .select()
      .from(schema.referrals)
      .where(eq(schema.referrals.refereeUserId, referee));
    expect(row!.status).toBe('PENDING');
  });

  it('earned credit is spendable on a later booking', async () => {
    const db = getDb(env.DB);
    const code = `N${crypto.randomUUID().slice(0, 7).toUpperCase()}`;
    const referrer = await customer(db, code);
    const referee = await customer(db, `O${crypto.randomUUID().slice(0, 7).toUpperCase()}`);
    await recordReferral(db, code, referee);

    const svc = await service(db, 1000);
    const orderId = await completedOrder(db, referee, svc);
    await payReferralReward(db, orderId);

    // The referrer now books something and spends the reward.
    const own = await placeOrder(db, {
      userId: referrer,
      serviceId: svc.serviceId,
      optionIds: [],
      scheduledDate: DATE,
      slotId: svc.slotId,
      requestedCredit: REWARD,
      notes: null,
    });

    expect(own).toMatchObject({ ok: true, creditApplied: REWARD, total: 1000 - REWARD });
    await expect(getCreditBalance(db, referrer)).resolves.toBe(0);
  });
});
