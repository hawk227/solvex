'use server';

import { getAvailability, type SlotAvailability } from '@solvex/db';
import { db } from '@/lib/cf';
import { requireCustomer } from '@/lib/session';

/**
 * Remaining room per slot for a date, read live when the customer changes date.
 *
 * Not audited: it reads public scheduling capacity, changes nothing, and fires
 * on every date change. Logging it would bury the entries that matter under
 * keystroke noise. Listed as an exemption in the audit coverage test.
 */
export async function fetchAvailability(date: string): Promise<SlotAvailability[]> {
  await requireCustomer();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  return getAvailability(db(), date);
}
