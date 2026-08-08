import { relations } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { user } from './customer-auth';

/**
 * Dhaka zones — Central, Old Dhaka, Northern, Southern and so on. Purely
 * organisational: nothing keys booking eligibility, technician coverage or
 * capacity to a zone. It exists so the address picker can narrow Area down to
 * a sane list instead of showing every serviceable area in one flat menu.
 */
export const zones = sqliteTable('zones', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  sort: integer('sort').notNull().default(0),
});

/**
 * Serviceable areas. Booking is restricted to active areas — this is the
 * level everything else in the system keys off: technician coverage
 * (technician_areas), the address on a profile, and the area snapshotted onto
 * an order.
 *
 * zoneId is nullable rather than required. The starting eight areas predate
 * zones and cannot all be safely assigned from a partial reference list —
 * forcing a value here would mean guessing, and a wrong zone assignment is
 * the kind of error nobody notices until a customer is confused by it.
 */
export const areas = sqliteTable('areas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  zoneId: integer('zone_id').references(() => zones.id, { onDelete: 'set null' }),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  sort: integer('sort').notNull().default(0),
});

/**
 * Neighbourhoods and landmarks inside an area — e.g. Motijheel contains
 * Dilkusha, Arambagh, Fakirapool. The finest-grained step in the address
 * picker. Deliberately NOT where technician coverage or capacity attaches:
 * a technician covers an area, not a single road, and scoping capacity this
 * finely would split it into hundreds of near-empty buckets for no operational
 * benefit.
 */
export const locations = sqliteTable('locations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  areaId: integer('area_id')
    .notNull()
    .references(() => areas.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  sort: integer('sort').notNull().default(0),
});

/**
 * Customer profile, keyed by the Better Auth user id. Deleting the account
 * removes the profile with it.
 */
export const profiles = sqliteTable('profiles', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  fullName: text('full_name').notNull(),
  phone: text('phone').notNull(),
  address: text('address').notNull(),
  areaId: integer('area_id').references(() => areas.id, { onDelete: 'set null' }),
  /**
   * The finest-grained pick from the cascading address picker. Optional and
   * informational only — nothing is keyed off it. areaId stays the field
   * every booking, coverage and capacity check actually uses.
   */
  locationId: integer('location_id').references(() => locations.id, { onDelete: 'set null' }),
  referralCode: text('referral_code').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const zonesRelations = relations(zones, ({ many }) => ({
  areas: many(areas),
}));

export const areasRelations = relations(areas, ({ one, many }) => ({
  zone: one(zones, { fields: [areas.zoneId], references: [zones.id] }),
  locations: many(locations),
  profiles: many(profiles),
}));

export const locationsRelations = relations(locations, ({ one }) => ({
  area: one(areas, { fields: [locations.areaId], references: [areas.id] }),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  area: one(areas, { fields: [profiles.areaId], references: [areas.id] }),
  location: one(locations, { fields: [profiles.locationId], references: [locations.id] }),
}));
