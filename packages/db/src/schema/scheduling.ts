import { relations } from 'drizzle-orm';
import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Named booking windows. `startTime`/`endTime` are "HH:MM" in Asia/Dhaka.
 * `label` is unique so the seed script can be re-run idempotently.
 */
export const slotTemplates = sqliteTable('slot_templates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  label: text('label').notNull().unique(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  sort: integer('sort').notNull().default(0),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
});

/**
 * Per-day capacity override. A missing row means the `default_slot_capacity`
 * setting applies, so days are never pre-generated.
 * `date` is "YYYY-MM-DD" already resolved to Asia/Dhaka local date.
 */
export const slotCapacity = sqliteTable(
  'slot_capacity',
  {
    date: text('date').notNull(),
    slotId: integer('slot_id')
      .notNull()
      .references(() => slotTemplates.id, { onDelete: 'cascade' }),
    capacity: integer('capacity').notNull(),
  },
  (t) => [primaryKey({ columns: [t.date, t.slotId] })],
);

export const slotTemplatesRelations = relations(slotTemplates, ({ many }) => ({
  overrides: many(slotCapacity),
}));

export const slotCapacityRelations = relations(slotCapacity, ({ one }) => ({
  slot: one(slotTemplates, { fields: [slotCapacity.slotId], references: [slotTemplates.id] }),
}));
