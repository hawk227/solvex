import { relations } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/** Serviceable areas. Booking is restricted to active areas. */
export const areas = sqliteTable('areas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  sort: integer('sort').notNull().default(0),
});

/**
 * Customer profile. `userId` is the Better Auth user id (a string). The
 * foreign key to Better Auth's `user` table is added in Phase 1, once that
 * table exists.
 */
export const profiles = sqliteTable('profiles', {
  userId: text('user_id').primaryKey(),
  fullName: text('full_name').notNull(),
  phone: text('phone').notNull(),
  address: text('address').notNull(),
  areaId: integer('area_id').references(() => areas.id, { onDelete: 'set null' }),
  referralCode: text('referral_code').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const areasRelations = relations(areas, ({ many }) => ({
  profiles: many(profiles),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  area: one(areas, { fields: [profiles.areaId], references: [areas.id] }),
}));
