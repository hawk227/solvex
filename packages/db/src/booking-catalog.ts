import { and, asc, eq } from 'drizzle-orm';
import type { Db } from './index';
import { categories, services, variableGroups, variableOptions, servicePrices } from './schema/catalog';

export type BookingCatalogService = { id: number; name: string; categoryName: string };
export type BookingCatalogGroup = {
  id: number;
  serviceId: number;
  name: string;
  options: { id: number; label: string }[];
};
export type BookingCatalogPrice = { serviceId: number; comboKey: string; price: number };

export type BookingCatalog = {
  services: BookingCatalogService[];
  groups: BookingCatalogGroup[];
  prices: BookingCatalogPrice[];
};

/**
 * The full active, bookable catalog, flat, for the CMS order-creation picker.
 * Same shape idea as `getGeography`: one small bulk read, filtered client-side
 * as service and options are picked, rather than a round trip per selection —
 * the CMS does not know which service the staff member will pick in advance,
 * unlike the customer-facing /book/[slug] page, which already knows.
 */
export async function getBookingCatalog(db: Db): Promise<BookingCatalog> {
  const publiclyVisible = and(eq(services.active, true), eq(categories.active, true));

  const serviceRows = await db
    .select({ id: services.id, name: services.name, categoryName: categories.name })
    .from(services)
    .innerJoin(categories, eq(categories.id, services.categoryId))
    .where(publiclyVisible)
    .orderBy(asc(categories.sort), asc(services.sort), asc(services.name));

  const groupRows = await db
    .select({ id: variableGroups.id, serviceId: variableGroups.serviceId, name: variableGroups.name })
    .from(variableGroups)
    .innerJoin(services, eq(services.id, variableGroups.serviceId))
    .innerJoin(categories, eq(categories.id, services.categoryId))
    .where(publiclyVisible)
    .orderBy(asc(variableGroups.sort));

  const groups: BookingCatalogGroup[] = await Promise.all(
    groupRows.map(async (group) => ({
      ...group,
      options: await db
        .select({ id: variableOptions.id, label: variableOptions.label })
        .from(variableOptions)
        .where(eq(variableOptions.groupId, group.id))
        .orderBy(asc(variableOptions.sort)),
    })),
  );

  const priceRows = await db
    .select({ serviceId: servicePrices.serviceId, comboKey: servicePrices.comboKey, price: servicePrices.price })
    .from(servicePrices)
    .innerJoin(services, eq(services.id, servicePrices.serviceId))
    .innerJoin(categories, eq(categories.id, services.categoryId))
    .where(publiclyVisible);

  return { services: serviceRows, groups, prices: priceRows };
}
