'use server';

import { getAvailability, type SlotAvailability } from '@solvex/db';
import { db } from '@/lib/cf';
import { requireCustomer } from '@/lib/session';

/** Remaining room per slot for a date, read live when the customer changes date. */
export async function fetchAvailability(date: string): Promise<SlotAvailability[]> {
  await requireCustomer();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  return getAvailability(db(), date);
}
