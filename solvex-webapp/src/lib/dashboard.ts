import { listCustomerTickets } from '@solvex/db';
import { db } from './cf';
import { listCustomerOrders, type CustomerOrder } from './orders';
import { getReferralSummary } from './referrals';

/** Statuses where a technician is still expected. */
const UPCOMING = ['PENDING', 'APPROVED', 'ON_THE_WAY', 'IN_PROGRESS'] as const;

export type Dashboard = {
  /** The one thing a customer opens this page to find out. */
  nextVisit: CustomerOrder | null;
  recent: CustomerOrder[];
  totalBookings: number;
  completedBookings: number;
  creditBalance: number;
  openTickets: { ref: string; subject: string; status: string }[];
};

export async function getDashboard(userId: string): Promise<Dashboard> {
  const [orders, referrals, tickets] = await Promise.all([
    listCustomerOrders(userId),
    getReferralSummary(userId),
    listCustomerTickets(db(), userId),
  ]);

  // Soonest first, so "next" means next by date rather than most recently booked.
  const upcoming = orders
    .filter((order) => (UPCOMING as readonly string[]).includes(order.status))
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));

  return {
    nextVisit: upcoming[0] ?? null,
    recent: orders.slice(0, 3),
    totalBookings: orders.length,
    completedBookings: orders.filter((o) => o.status === 'COMPLETED').length,
    creditBalance: referrals.balance,
    // Resolved and closed tickets are not waiting on anyone.
    openTickets: tickets
      .filter((t) => t.status === 'OPEN' || t.status === 'ANSWERED')
      .map((t) => ({ ref: t.ref, subject: t.subject, status: t.status })),
  };
}
