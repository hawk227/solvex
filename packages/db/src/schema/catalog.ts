import { relations } from 'drizzle-orm';
import { index, integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';

export type Faq = { q: string; a: string };

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  imageKey: text('image_key'),
  sort: integer('sort').notNull().default(0),
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
});

export const services = sqliteTable(
  'services',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    shortDesc: text('short_desc'),
    imageKey: text('image_key'),
    durationMin: integer('duration_min'),
    sort: integer('sort').notNull().default(0),
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
    aboutMd: text('about_md'),
    includedJson: text('included_json', { mode: 'json' }).$type<string[]>(),
    notIncludedJson: text('not_included_json', { mode: 'json' }).$type<string[]>(),
    faqsJson: text('faqs_json', { mode: 'json' }).$type<Faq[]>(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index('services_category_idx').on(t.categoryId)],
);

export const variableGroups = sqliteTable(
  'variable_groups',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    serviceId: integer('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    sort: integer('sort').notNull().default(0),
  },
  (t) => [index('variable_groups_service_idx').on(t.serviceId)],
);

export const variableOptions = sqliteTable(
  'variable_options',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    groupId: integer('group_id')
      .notNull()
      .references(() => variableGroups.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    sort: integer('sort').notNull().default(0),
  },
  (t) => [index('variable_options_group_idx').on(t.groupId)],
);

/**
 * One row per full combination of variable options for a service.
 * `comboKey` is the selected option ids sorted ascending and joined by "-";
 * a service with no variable groups uses the empty string.
 * `price` is integer BDT taka.
 */
export const servicePrices = sqliteTable(
  'service_prices',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    serviceId: integer('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    comboKey: text('combo_key').notNull(),
    price: integer('price').notNull(),
  },
  (t) => [unique('service_prices_combo_unq').on(t.serviceId, t.comboKey)],
);

export const categoriesRelations = relations(categories, ({ many }) => ({
  services: many(services),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  category: one(categories, { fields: [services.categoryId], references: [categories.id] }),
  variableGroups: many(variableGroups),
  prices: many(servicePrices),
}));

export const variableGroupsRelations = relations(variableGroups, ({ one, many }) => ({
  service: one(services, { fields: [variableGroups.serviceId], references: [services.id] }),
  options: many(variableOptions),
}));

export const variableOptionsRelations = relations(variableOptions, ({ one }) => ({
  group: one(variableGroups, {
    fields: [variableOptions.groupId],
    references: [variableGroups.id],
  }),
}));

export const servicePricesRelations = relations(servicePrices, ({ one }) => ({
  service: one(services, { fields: [servicePrices.serviceId], references: [services.id] }),
}));
