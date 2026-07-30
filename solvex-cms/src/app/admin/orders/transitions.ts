import type { OrderStatus } from '@solvex/db';

/**
 * Which statuses may follow which.
 *
 * Deliberately NOT in actions.ts: every export from a `'use server'` module must
 * be an async function, so a plain lookup helper cannot live there.
 */
export const ALLOWED_NEXT: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['APPROVED', 'CANCELLED'],
  APPROVED: ['ON_THE_WAY', 'CANCELLED'],
  ON_THE_WAY: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function allowedNext(status: OrderStatus): OrderStatus[] {
  return ALLOWED_NEXT[status];
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  ON_THE_WAY: 'On the way',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const STATUS_TONE: Record<
  OrderStatus,
  'neutral' | 'info' | 'warning' | 'success' | 'danger'
> = {
  PENDING: 'warning',
  APPROVED: 'info',
  ON_THE_WAY: 'info',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};
