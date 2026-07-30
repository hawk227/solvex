import { relations } from 'drizzle-orm';
import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { adminUser } from './admin-auth';

/** Back-office areas access is granted over. */
export const PERMISSION_MODULES = [
  'orders',
  'tickets',
  'catalog',
  'technicians',
  'customers',
  'referrals',
  'analytics',
  'settings',
] as const;

export type PermissionModule = (typeof PERMISSION_MODULES)[number];

/**
 * Ordered deliberately: a check is a comparison, not a set lookup, so `manage`
 * satisfies a `view` requirement without anyone having to remember to list both.
 */
export const PERMISSION_LEVELS = ['none', 'view', 'manage'] as const;
export type PermissionLevel = (typeof PERMISSION_LEVELS)[number];

/**
 * One row per employee per module. A missing row means `none` — absence of a
 * grant is not access.
 */
export const adminPermissions = sqliteTable(
  'admin_permissions',
  {
    adminUserId: text('admin_user_id')
      .notNull()
      .references(() => adminUser.id, { onDelete: 'cascade' }),
    module: text('module').notNull().$type<PermissionModule>(),
    level: text('level').notNull().$type<PermissionLevel>().default('none'),
  },
  (t) => [primaryKey({ columns: [t.adminUserId, t.module] })],
);

/**
 * Who changed access, and when.
 *
 * Not optional: permission and account-status changes are exactly the events you
 * need a record of when something goes wrong, and nothing else captures them.
 */
export const adminAudit = sqliteTable(
  'admin_audit',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    actorId: text('actor_id'),
    action: text('action').notNull(),
    subjectId: text('subject_id'),
    detail: text('detail'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index('admin_audit_subject_idx').on(t.subjectId)],
);

export const adminPermissionsRelations = relations(adminPermissions, ({ one }) => ({
  employee: one(adminUser, {
    fields: [adminPermissions.adminUserId],
    references: [adminUser.id],
  }),
}));
