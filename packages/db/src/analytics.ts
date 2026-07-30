import { sql } from 'drizzle-orm';
import type { Db } from './index';

/**
 * Dashboard queries.
 *
 * Two rules run through all of these:
 *
 *  - **Revenue means COMPLETED work only.** A pending or cancelled order is not
 *    money, and reporting it as revenue would overstate the business.
 *  - **Every column is written table-qualified as literal SQL text.**
 *    Interpolating a Drizzle column into a raw `sql` template emits it
 *    unqualified, which silently resolves against the wrong table inside a
 *    subquery. See `aggregates.ts`.
 *
 * Days are Asia/Dhaka days. `scheduled_date` is already stored as a Dhaka date
 * string; `created_at` is epoch milliseconds, so it is shifted by +6 hours before
 * being truncated to a date.
 */

const DHAKA_DAY = (column: string) =>
  sql.raw(`date(${column} / 1000, 'unixepoch', '+6 hours')`);

export type Kpis = {
  ordersTotal: number;
  ordersPending: number;
  ordersCompleted: number;
  ordersCancelled: number;
  revenue: number;
  creditRedeemed: number;
  customers: number;
  averageOrderValue: number;
};

export async function getKpis(db: Db): Promise<Kpis> {
  const [row] = await db.all<{
    ordersTotal: number;
    ordersPending: number;
    ordersCompleted: number;
    ordersCancelled: number;
    revenue: number;
    creditRedeemed: number;
    customers: number;
  }>(sql`
    SELECT
      (SELECT count(*) FROM orders) AS ordersTotal,
      (SELECT count(*) FROM orders WHERE orders.status = 'PENDING') AS ordersPending,
      (SELECT count(*) FROM orders WHERE orders.status = 'COMPLETED') AS ordersCompleted,
      (SELECT count(*) FROM orders WHERE orders.status = 'CANCELLED') AS ordersCancelled,
      (SELECT COALESCE(SUM(orders.total), 0) FROM orders WHERE orders.status = 'COMPLETED') AS revenue,
      (SELECT COALESCE(SUM(orders.credit_applied), 0) FROM orders WHERE orders.status = 'COMPLETED') AS creditRedeemed,
      (SELECT count(*) FROM profiles) AS customers
  `);

  const completed = Number(row?.ordersCompleted ?? 0);
  const revenue = Number(row?.revenue ?? 0);

  return {
    ordersTotal: Number(row?.ordersTotal ?? 0),
    ordersPending: Number(row?.ordersPending ?? 0),
    ordersCompleted: completed,
    ordersCancelled: Number(row?.ordersCancelled ?? 0),
    revenue,
    creditRedeemed: Number(row?.creditRedeemed ?? 0),
    customers: Number(row?.customers ?? 0),
    // Integer taka throughout, so this is rounded rather than left fractional.
    averageOrderValue: completed === 0 ? 0 : Math.round(revenue / completed),
  };
}

export type DailyPoint = { date: string; orders: number; revenue: number };

/**
 * Orders and completed revenue per scheduled day, oldest first.
 *
 * Days with no orders are filled in as zeros: a chart that silently skips empty
 * days misrepresents a quiet week as a busy one.
 */
export async function getOrdersByDay(db: Db, days = 14): Promise<DailyPoint[]> {
  const rows = await db.all<{ date: string; orders: number; revenue: number }>(sql`
    SELECT
      orders.scheduled_date AS date,
      count(*) AS orders,
      COALESCE(SUM(CASE WHEN orders.status = 'COMPLETED' THEN orders.total ELSE 0 END), 0) AS revenue
    FROM orders
    WHERE orders.status <> 'CANCELLED'
    GROUP BY orders.scheduled_date
  `);

  const bydate = new Map(rows.map((r) => [r.date, r]));

  const out: DailyPoint[] = [];
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now - i * 86_400_000).toLocaleDateString('en-CA', {
      timeZone: 'Asia/Dhaka',
    });
    const hit = bydate.get(date);
    out.push({
      date,
      orders: Number(hit?.orders ?? 0),
      revenue: Number(hit?.revenue ?? 0),
    });
  }
  return out;
}

export type BreakdownRow = {
  name: string;
  orders: number;
  revenue: number;
};

/** Top services by order count, with completed revenue alongside. */
export async function getServiceBreakdown(db: Db, limit = 8): Promise<BreakdownRow[]> {
  const rows = await db.all<{ name: string; orders: number; revenue: number }>(sql`
    SELECT
      services.name AS name,
      count(*) AS orders,
      COALESCE(SUM(CASE WHEN orders.status = 'COMPLETED' THEN orders.total ELSE 0 END), 0) AS revenue
    FROM orders
    JOIN services ON services.id = orders.service_id
    WHERE orders.status <> 'CANCELLED'
    GROUP BY services.id, services.name
    ORDER BY orders DESC, revenue DESC
    LIMIT ${limit}
  `);

  return rows.map((r) => ({
    name: r.name,
    orders: Number(r.orders),
    revenue: Number(r.revenue),
  }));
}

export async function getCategoryBreakdown(db: Db): Promise<BreakdownRow[]> {
  const rows = await db.all<{ name: string; orders: number; revenue: number }>(sql`
    SELECT
      categories.name AS name,
      count(*) AS orders,
      COALESCE(SUM(CASE WHEN orders.status = 'COMPLETED' THEN orders.total ELSE 0 END), 0) AS revenue
    FROM orders
    JOIN services ON services.id = orders.service_id
    JOIN categories ON categories.id = services.category_id
    WHERE orders.status <> 'CANCELLED'
    GROUP BY categories.id, categories.name
    ORDER BY orders DESC
  `);

  return rows.map((r) => ({
    name: r.name,
    orders: Number(r.orders),
    revenue: Number(r.revenue),
  }));
}

export type SlotUsage = { label: string; orders: number };

/** How bookings distribute across the time windows. */
export async function getSlotUsage(db: Db): Promise<SlotUsage[]> {
  const rows = await db.all<{ label: string; orders: number }>(sql`
    SELECT
      slot_templates.label AS label,
      count(orders.id) AS orders
    FROM slot_templates
    LEFT JOIN orders
      ON orders.slot_id = slot_templates.id AND orders.status <> 'CANCELLED'
    GROUP BY slot_templates.id, slot_templates.label
    ORDER BY slot_templates.sort
  `);

  return rows.map((r) => ({ label: r.label, orders: Number(r.orders) }));
}

export type AreaUsage = { name: string; orders: number };

export async function getAreaUsage(db: Db, limit = 8): Promise<AreaUsage[]> {
  const rows = await db.all<{ name: string; orders: number }>(sql`
    SELECT
      areas.name AS name,
      count(*) AS orders
    FROM orders
    JOIN areas ON areas.id = orders.area_id
    WHERE orders.status <> 'CANCELLED'
    GROUP BY areas.id, areas.name
    ORDER BY orders DESC
    LIMIT ${limit}
  `);

  return rows.map((r) => ({ name: r.name, orders: Number(r.orders) }));
}

export type GrowthPoint = { date: string; signups: number };

/** New customer profiles per Dhaka day, oldest first, zeros filled in. */
export async function getCustomerGrowth(db: Db, days = 14): Promise<GrowthPoint[]> {
  const rows = await db.all<{ date: string; signups: number }>(sql`
    SELECT
      ${DHAKA_DAY('profiles.created_at')} AS date,
      count(*) AS signups
    FROM profiles
    GROUP BY date
  `);

  const bydate = new Map(rows.map((r) => [r.date, Number(r.signups)]));

  const out: GrowthPoint[] = [];
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now - i * 86_400_000).toLocaleDateString('en-CA', {
      timeZone: 'Asia/Dhaka',
    });
    out.push({ date, signups: bydate.get(date) ?? 0 });
  }
  return out;
}
