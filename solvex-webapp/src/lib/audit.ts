import { headers } from 'next/headers';
import { recordAudit, type AuditInput } from '@solvex/db';
import { auditDb } from './cf';
import { getCustomer } from './session';

type Entry = Omit<AuditInput, 'app' | 'actorType' | 'actorId' | 'actorName' | 'actorEmail'>;

/**
 * Record one customer-side action.
 *
 * The actor is resolved here rather than passed in, for the same reason as in
 * the back-office: a caller's idea of who is acting can be wrong, and a
 * misattributed entry is worse than a missing one. `recordAudit` never throws,
 * so a logging fault cannot fail a booking.
 */
export async function audit(entry: Entry): Promise<void> {
  const customer = await getCustomer();
  const head = await headers();

  await recordAudit(auditDb(), {
    ...entry,
    app: 'WEB',
    actorType: customer ? 'CUSTOMER' : 'ANON',
    actorId: customer?.id ?? null,
    actorName: customer?.name ?? null,
    actorEmail: customer?.email ?? null,
    ip: head.get('cf-connecting-ip') ?? head.get('x-forwarded-for'),
    userAgent: head.get('user-agent'),
  });
}
