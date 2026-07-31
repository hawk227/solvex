import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Better Auth tables for the CMS, kept entirely separate from the customer
 * auth tables the webapp will add in Phase 3. Same database, different tables:
 * an admin session must never be usable as a customer session, or vice versa.
 *
 * Column names follow Better Auth's expected core schema. The drizzle adapter
 * maps its model names onto these via the `schema` option in
 * `solvex-cms/src/lib/auth.ts`.
 */

export const adminUser = sqliteTable('admin_user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),

  /**
   * Owners implicitly hold `manage` on every module and are the only employees
   * who may edit anyone's permissions. Kept out of the permission grid on
   * purpose: if "can administer employees" were just another grid cell, a
   * manager could grant it to themselves and the model would be decorative.
   */
  isOwner: integer('is_owner', { mode: 'boolean' }).notNull().default(false),

  /** Employees are deactivated, never deleted, so past actions stay attributable. */
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  /**
   * Soft delete. NULL means present; a timestamp means removed.
   *
   * Distinct from `active`, which means "paused and will come back".
   * Deleting keeps the row so orders, tickets and the audit log continue to
   * name something real — and so the trail of what existed survives.
   */
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  deletedBy: text('deleted_by'),

  /** Set when an owner issues a temporary password. Blocks every guarded route. */
  mustChangePassword: integer('must_change_password', { mode: 'boolean' })
    .notNull()
    .default(false),

  /**
   * When the temporary password was issued. An unused temporary password expires,
   * because it travels over chat and should not stay valid indefinitely.
   */
  tempPasswordIssuedAt: integer('temp_password_issued_at', { mode: 'timestamp_ms' }),

  createdBy: text('created_by'),
  lastLoginAt: integer('last_login_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const adminSession = sqliteTable('admin_session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => adminUser.id, { onDelete: 'cascade' }),
});

export const adminAccount = sqliteTable('admin_account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => adminUser.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp_ms' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp_ms' }),
  scope: text('scope'),
  /** bcrypt/scrypt hash for email+password accounts. Never a plaintext password. */
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const adminVerification = sqliteTable('admin_verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});
