import { sql } from 'drizzle-orm';

/**
 * Correlated subqueries, shared so there is exactly one tested copy.
 *
 * IMPORTANT: every column here is written table-qualified as literal SQL text.
 * Interpolating a Drizzle column (`${schema.categories.id}`) inside a raw `sql`
 * template emits it UNQUALIFIED — `"id"` rather than `"categories"."id"` — and
 * inside a subquery that resolves against the subquery's own table instead of
 * the outer one. The result is a silently wrong number, not an error. Do not
 * "tidy" these back into interpolated columns.
 */

/** Active services in a category. Correlates to the outer `categories` row. */
export const activeServiceCount = sql<number>`(
  SELECT count(*) FROM services
  WHERE services.category_id = categories.id AND services.active = 1
)`;

/** Lowest configured price for a service, or NULL when nothing is priced. */
export const minServicePrice = sql<number | null>`(
  SELECT MIN(service_prices.price) FROM service_prices
  WHERE service_prices.service_id = services.id
)`;

/** How many combinations have a price. Zero means the service is not bookable. */
export const servicePriceCount = sql<number>`(
  SELECT count(*) FROM service_prices
  WHERE service_prices.service_id = services.id
)`;

/** How many variable groups a service defines. */
export const variableGroupCount = sql<number>`(
  SELECT count(*) FROM variable_groups
  WHERE variable_groups.service_id = services.id
)`;
