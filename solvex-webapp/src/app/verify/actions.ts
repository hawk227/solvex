'use server';

import { recordReferral } from '@solvex/db';
import { db } from '@/lib/cf';
import { requireCustomer } from '@/lib/session';
import { audit } from '@/lib/audit';

/**
 * Record who referred the signed-in customer, after their email is verified.
 *
 * The rules (unknown code, self-referral, already-referred, and the concurrent
 * case) live in `recordReferral` in @solvex/db, where they are tested against a
 * real database. A failure is not surfaced to the user: a mistyped or ineligible
 * code must not block someone from finishing signup.
 */
export async function attachReferral(code: string): Promise<{ ok: boolean }> {
  const customer = await requireCustomer();
  const result = await recordReferral(db(), code, customer.id);

  await audit({
    action: 'referral.attach',
    targetType: 'customer',
    targetId: customer.id,
    outcome: result.ok ? 'OK' : 'DENIED',
    reason: result.ok ? null : 'code not eligible',
  });

  return { ok: result.ok };
}
