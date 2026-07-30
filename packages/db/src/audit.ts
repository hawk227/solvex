import { and, desc, eq, like, lt, or, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import {
  AUDIT_ACTOR_TYPES,
  AUDIT_OUTCOMES,
  auditLog,
  type AuditActorType,
  type AuditEntry,
  type AuditOutcome,
} from './schema/audit';

/**
 * Drizzle client for the audit database.
 *
 * Takes the binding explicitly, and there is deliberately no default: passing
 * the application `DB` here would silently write the log into the very database
 * it is supposed to be independent of, and nothing would look wrong.
 */
export function getAuditDb(d1: D1Database) {
  return drizzle(d1, { schema: { auditLog } });
}

export type AuditDb = ReturnType<typeof getAuditDb>;

/**
 * Field names whose values must never reach the log.
 *
 * A denylist by exact key name, matched case-insensitively. `code` is on it
 * because the sign-in OTP arrives under that name; order codes are recorded in
 * `targetLabel` instead, so nothing readable is lost by refusing it here.
 *
 * The rule is applied at the point of writing rather than at each call site.
 * Relying on 44 callers to remember not to pass a password is relying on 44
 * chances to forget.
 */
const REDACTED_KEYS = new Set([
  'password',
  'newpassword',
  'currentpassword',
  'confirmpassword',
  'temppassword',
  'otp',
  'code',
  'token',
  'sessiontoken',
  'secret',
  'apikey',
  'authorization',
  'cookie',
]);

export const REDACTED = '[redacted]';

/**
 * Strip secrets from a detail object, recursively.
 *
 * Returns a new structure; the caller's object is never mutated. Unknown types
 * are stringified rather than dropped, so an unexpected value still leaves a
 * trace of having been there.
 */
export function redact(value: unknown, depth = 0): unknown {
  // A cheap guard against a cyclic or absurdly nested object stalling a write.
  if (depth > 6) return '[too deep]';

  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));

  if (typeof value === 'object') {
    if (value instanceof Date) return value.toISOString();
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      out[key] = REDACTED_KEYS.has(key.toLowerCase()) ? REDACTED : redact(inner, depth + 1);
    }
    return out;
  }

  return value;
}

/** Long free text is truncated: the log records that something changed, not a copy of it. */
function trim(text: string | null | undefined, max: number): string | null {
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export type AuditInput = {
  app: 'CMS' | 'WEB';
  actorType: AuditActorType;
  actorId?: string | null;
  actorName?: string | null;
  actorEmail?: string | null;
  action: string;
  module?: string | null;
  targetType?: string | null;
  targetId?: string | number | null;
  targetLabel?: string | null;
  outcome?: AuditOutcome;
  reason?: string | null;
  detail?: unknown;
  ip?: string | null;
  userAgent?: string | null;
};

/**
 * Write one entry. Never throws, and never rejects.
 *
 * Deliberately fail-open: the audit database is separate, so its write cannot
 * share a transaction with the action that caused it. If the log were allowed
 * to throw, an audit outage would start refusing customer bookings and
 * cancelling orders mid-flight — a logging fault escalated into an outage of
 * the actual business. The trade is that a failed write leaves a gap, so the
 * failure is reported to the Worker log where it is visible.
 *
 * If this product ever needs a tamper-evident, provably complete log (it does
 * not today), that requires a different design — fail-closed writes and hash
 * chaining — not a tweak here.
 */
export async function recordAudit(auditDb: AuditDb, input: AuditInput): Promise<void> {
  try {
    await auditDb.insert(auditLog).values({
      at: new Date(),
      app: input.app,
      actorType: input.actorType,
      actorId: input.actorId ?? null,
      actorName: trim(input.actorName, 120),
      actorEmail: trim(input.actorEmail, 200),
      action: input.action,
      module: input.module ?? null,
      targetType: input.targetType ?? null,
      targetId: input.targetId === null || input.targetId === undefined ? null : String(input.targetId),
      targetLabel: trim(input.targetLabel, 200),
      outcome: input.outcome ?? 'OK',
      reason: trim(input.reason, 300),
      detail:
        input.detail === undefined ? null : trim(JSON.stringify(redact(input.detail)), 4000),
      ip: input.ip ?? null,
      userAgent: trim(input.userAgent, 300),
    });
  } catch (err) {
    // Swallowed on purpose — see the note above. Surfaced, not hidden.
    console.error('audit write failed', {
      action: input.action,
      actorId: input.actorId,
      error: String(err),
    });
  }
}

export type AuditFilters = {
  actorId?: string;
  action?: string;
  app?: 'CMS' | 'WEB';
  outcome?: AuditOutcome;
  /** Matches actor name, email, or the target label. */
  search?: string;
  /** Keyset pagination: entries strictly older than this id. */
  before?: number;
  limit?: number;
};

/**
 * Read the log, newest first.
 *
 * Paged by id rather than OFFSET: the table only grows, and a deep OFFSET makes
 * SQLite walk every skipped row.
 */
export async function listAuditLog(
  auditDb: AuditDb,
  filters: AuditFilters = {},
): Promise<AuditEntry[]> {
  const limit = Math.min(filters.limit ?? 50, 200);
  const where = [];

  if (filters.actorId) where.push(eq(auditLog.actorId, filters.actorId));
  if (filters.action) where.push(eq(auditLog.action, filters.action));
  if (filters.app) where.push(eq(auditLog.app, filters.app));
  if (filters.outcome) where.push(eq(auditLog.outcome, filters.outcome));
  if (filters.before) where.push(lt(auditLog.id, filters.before));

  if (filters.search) {
    // Escape LIKE wildcards so a typed "%" searches for a percent sign rather
    // than matching the entire log.
    const term = `%${filters.search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    where.push(
      or(
        like(auditLog.actorName, term),
        like(auditLog.actorEmail, term),
        like(auditLog.targetLabel, term),
      )!,
    );
  }

  const query = auditDb.select().from(auditLog);
  return (where.length > 0 ? query.where(and(...where)) : query)
    .orderBy(desc(auditLog.id))
    .limit(limit);
}

/** Distinct action names present in the log, for the viewer's filter menu. */
export async function listAuditActions(auditDb: AuditDb): Promise<string[]> {
  const rows = await auditDb
    .selectDistinct({ action: auditLog.action })
    .from(auditLog)
    .orderBy(auditLog.action);
  return rows.map((row) => row.action);
}

export async function countAuditEntries(auditDb: AuditDb): Promise<number> {
  const [row] = await auditDb.select({ n: sql<number>`count(*)` }).from(auditLog);
  return Number(row?.n ?? 0);
}

export { auditLog, AUDIT_ACTOR_TYPES, AUDIT_OUTCOMES };
export type { AuditActorType, AuditOutcome, AuditEntry };
