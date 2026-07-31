import { relations } from 'drizzle-orm';
import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { areas } from './customer';
import { categories } from './catalog';

/**
 * Field technicians.
 *
 * Staff records, not accounts: technicians do not log in. Everything here is
 * managed by an admin in the back-office.
 *
 * `phone` is UNIQUE because it is how operations actually identify a person —
 * two records for the same number means two people get dispatched to one job.
 */
export const technicians = sqliteTable(
  'technicians',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    fullName: text('full_name').notNull(),
    /** Normalised to +8801XXXXXXXXX, same as customer phones. */
    phone: text('phone').notNull().unique(),
    email: text('email'),
    /** Free text: where they are based. Not an address we dispatch to. */
    baseArea: text('base_area'),
    photoKey: text('photo_key'),
    /** "YYYY-MM-DD" in Asia/Dhaka. */
    joinedOn: text('joined_on'),
    notes: text('notes'),
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
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index('technicians_active_idx').on(t.active)],
);

/** Which appliance categories a technician is qualified for. */
export const technicianSkills = sqliteTable(
  'technician_skills',
  {
    technicianId: integer('technician_id')
      .notNull()
      .references(() => technicians.id, { onDelete: 'cascade' }),
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.technicianId, t.categoryId] })],
);

/** Which serviceable areas a technician covers. */
export const technicianAreas = sqliteTable(
  'technician_areas',
  {
    technicianId: integer('technician_id')
      .notNull()
      .references(() => technicians.id, { onDelete: 'cascade' }),
    areaId: integer('area_id')
      .notNull()
      .references(() => areas.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.technicianId, t.areaId] })],
);

export const techniciansRelations = relations(technicians, ({ many }) => ({
  skills: many(technicianSkills),
  areas: many(technicianAreas),
}));

export const technicianSkillsRelations = relations(technicianSkills, ({ one }) => ({
  technician: one(technicians, {
    fields: [technicianSkills.technicianId],
    references: [technicians.id],
  }),
  category: one(categories, {
    fields: [technicianSkills.categoryId],
    references: [categories.id],
  }),
}));

export const technicianAreasRelations = relations(technicianAreas, ({ one }) => ({
  technician: one(technicians, {
    fields: [technicianAreas.technicianId],
    references: [technicians.id],
  }),
  area: one(areas, { fields: [technicianAreas.areaId], references: [areas.id] }),
}));
