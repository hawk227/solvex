import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * The audit log. Lives in its OWN D1 database, not the application one.
 *
 * That separation is the whole point, and it has consequences worth stating:
 *
 *  - No foreign keys. Nothing here can reference `orders` or `admin_user`,
 *    because those tables are in a different database. Every human-readable
 *    label is therefore denormalised at write time. That is not redundancy to
 *    be tidied away later — an entry must still read correctly after the row it
 *    describes has been renamed or deleted, which is exactly when a log matters.
 *
 *  - No transactions with the application write. An action commits and the log
 *    entry is written after it; the two cannot succeed or fail together. See
 *    `recordAudit` for how that is handled.
 *
 *  - Append-only by convention. Nothing in the codebase updates or deletes a
 *    row here. There is no `updateAuditEntry`, and there should never be one.
 */
export const AUDIT_ACTOR_TYPES = ['EMPLOYEE', 'CUSTOMER', 'ANON', 'SYSTEM'] as const;
export type AuditActorType = (typeof AUDIT_ACTOR_TYPES)[number];

/**
 * OK — it happened. DENIED — refused by a permission check or an ownership
 * check. ERROR — attempted and failed.
 *
 * DENIED is the row worth having. A log of only successful actions cannot tell
 * you that someone spent an afternoon probing pages they cannot open.
 */
export const AUDIT_OUTCOMES = ['OK', 'DENIED', 'ERROR'] as const;
export type AuditOutcome = (typeof AUDIT_OUTCOMES)[number];

export const auditLog = sqliteTable(
  'audit_log',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    at: integer('at', { mode: 'timestamp' }).notNull(),

    /** Which app the call came through. The two have different threat models. */
    app: text('app').notNull().$type<'CMS' | 'WEB'>(),

    actorType: text('actor_type').notNull().$type<AuditActorType>(),
    /** Null for a failed login: there is no established identity to record. */
    actorId: text('actor_id'),
    /** Denormalised — see the note above. Kept even when the account is gone. */
    actorName: text('actor_name'),
    /**
     * Also denormalised, and the only identifier available on a failed login,
     * where the whole point is that the email matched no account.
     */
    actorEmail: text('actor_email'),

    /** Dotted and stable, e.g. `catalog.category.create`, `auth.login.failed`. */
    action: text('action').notNull(),
    /** Permission module, where one applies. Null for auth and customer events. */
    module: text('module'),

    /** What was acted on, e.g. `order` / `42` / `SX-7K2M9P`. */
    targetType: text('target_type'),
    targetId: text('target_id'),
    /** Human-readable label, denormalised so the entry survives a deletion. */
    targetLabel: text('target_label'),

    outcome: text('outcome').notNull().$type<AuditOutcome>().default('OK'),
    /** Why it was denied, or what went wrong. Never a stack trace. */
    reason: text('reason'),

    /** Redacted JSON. See `redact` — secrets must never reach this column. */
    detail: text('detail'),

    ip: text('ip'),
    userAgent: text('user_agent'),
  },
  (table) => [
    // The three ways anyone actually reads this: recent-first, by person, by
    // thing. Without these the viewer table-scans a log that only ever grows.
    index('audit_at_idx').on(table.at),
    index('audit_actor_idx').on(table.actorId, table.at),
    index('audit_target_idx').on(table.targetType, table.targetId),
    index('audit_action_idx').on(table.action),
  ],
);

export type AuditEntry = typeof auditLog.$inferSelect;
