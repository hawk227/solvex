import { headers } from 'next/headers';
import { recordAudit, type AuditInput } from '@solvex/db';
import { auditDb } from './cf';
import { getCurrentEmployee } from './session';

type Entry = Omit<AuditInput, 'app' | 'actorType' | 'actorId' | 'actorName' | 'actorEmail'>;

/**
 * Record one back-office action.
 *
 * The actor is resolved here, not passed in: a caller that supplies its own
 * idea of who is acting can be wrong, and a log that misattributes an action is
 * worse than no log. `recordAudit` never throws, so this is safe to call on any
 * path — including one that is about to throw itself.
 *
 * Awaited rather than deferred to `waitUntil`. A D1 insert is quick, and a log
 * that silently skips entries whenever the runtime declines to run a background
 * task would be worth less than the milliseconds it saves.
 */
export async function audit(entry: Entry): Promise<void> {
  const employee = await getCurrentEmployee();
  const head = await headers();

  await recordAudit(auditDb(), {
    ...entry,
    app: 'CMS',
    actorType: employee ? 'EMPLOYEE' : 'ANON',
    actorId: employee?.id ?? null,
    actorName: employee?.name ?? null,
    actorEmail: employee?.email ?? null,
    ip: head.get('cf-connecting-ip') ?? head.get('x-forwarded-for'),
    userAgent: head.get('user-agent'),
  });
}

/**
 * Record an action for an actor already in hand.
 *
 * For the two cases where `getCurrentEmployee()` cannot answer: a failed sign-in
 * (no session exists yet) and a denial (where the identity is already resolved
 * and re-reading it would be a second database round trip).
 */
export async function auditAs(
  actor: { id: string | null; name: string | null; email: string | null },
  entry: Entry,
): Promise<void> {
  const head = await headers();

  await recordAudit(auditDb(), {
    ...entry,
    app: 'CMS',
    actorType: actor.id ? 'EMPLOYEE' : 'ANON',
    actorId: actor.id,
    actorName: actor.name,
    actorEmail: actor.email,
    ip: head.get('cf-connecting-ip') ?? head.get('x-forwarded-for'),
    userAgent: head.get('user-agent'),
  });
}
