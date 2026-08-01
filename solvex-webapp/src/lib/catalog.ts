import { and, asc, eq, like, or, sql } from 'drizzle-orm';
import { activeServiceCount, minCategoryPrice, minServicePrice, notDeleted, schema } from '@solvex/db';
import { db, imageUrl } from './cf';
import type { ServiceCardData } from '@/components/ui/service-card';
import type { RailCategory } from '@/components/home/category-rail';

/**
 * Public catalog reads. Only ACTIVE rows are ever returned: an inactive
 * category or service must be invisible to customers, including via a direct
 * URL, not merely hidden from listings.
 */


export async function getActiveAreas() {
  return db()
    .select({ id: schema.areas.id, name: schema.areas.name })
    .from(schema.areas)
    .where(eq(schema.areas.active, true))
    .orderBy(asc(schema.areas.sort), asc(schema.areas.name));
}

export async function getRailCategories(): Promise<RailCategory[]> {
  const rows = await db()
    .select({
      id: schema.categories.id,
      slug: schema.categories.slug,
      name: schema.categories.name,
      imageKey: schema.categories.imageKey,
      serviceCount: activeServiceCount,
      fromPrice: minCategoryPrice,
    })
    .from(schema.categories)
    .where(eq(schema.categories.active, true))
    .orderBy(asc(schema.categories.sort), asc(schema.categories.name));

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    imageUrl: imageUrl(row.imageKey),
    serviceCount: Number(row.serviceCount ?? 0),
    fromPrice: row.fromPrice === null ? null : Number(row.fromPrice),
  }))
    // A category with nothing bookable in it is a dead end for the customer
    // and a thin page for a crawler. Hidden until it has a service.
    .filter((category) => category.serviceCount > 0);
}

function serviceSelection() {
  return {
    id: schema.services.id,
    slug: schema.services.slug,
    name: schema.services.name,
    shortDesc: schema.services.shortDesc,
    imageKey: schema.services.imageKey,
    durationMin: schema.services.durationMin,
    categoryName: schema.categories.name,
    categorySlug: schema.categories.slug,
    fromPrice: minServicePrice,
  };
}

type ServiceRow = {
  id: number;
  slug: string;
  name: string;
  shortDesc: string | null;
  imageKey: string | null;
  durationMin: number | null;
  categoryName: string;
  categorySlug: string;
  fromPrice: number | null;
};

function toCard(row: ServiceRow): ServiceCardData {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortDesc: row.shortDesc,
    categoryName: row.categoryName,
    categorySlug: row.categorySlug,
    imageUrl: imageUrl(row.imageKey),
    durationMin: row.durationMin,
    fromPrice: row.fromPrice === null ? null : Number(row.fromPrice),
  };
}

/** Both category and service must be active for a service to be listed. */
const publiclyVisible = and(eq(schema.services.active, true), eq(schema.categories.active, true));

export async function getServices(options: {
  categorySlug?: string | undefined;
  query?: string | undefined;
  limit?: number | undefined;
}): Promise<ServiceCardData[]> {
  const filters = [publiclyVisible];

  if (options.categorySlug) {
    filters.push(eq(schema.categories.slug, options.categorySlug));
  }

  if (options.query) {
    // Escape LIKE wildcards so a user typing "%" searches for a literal "%"
    // instead of matching every row.
    const escaped = options.query.replace(/[\\%_]/g, (c) => `\\${c}`);
    const term = `%${escaped}%`;
    filters.push(
      or(
        like(schema.services.name, term),
        like(schema.services.shortDesc, term),
        like(schema.categories.name, term),
      )!,
    );
  }

  const rows = await db()
    .select(serviceSelection())
    .from(schema.services)
    .innerJoin(schema.categories, eq(schema.categories.id, schema.services.categoryId))
    .where(and(...filters))
    .orderBy(asc(schema.categories.sort), asc(schema.services.sort), asc(schema.services.name))
    .limit(options.limit ?? 200);

  return rows.map(toCard);
}

export async function getServiceBySlug(slug: string) {
  const [row] = await db()
    .select({
      id: schema.services.id,
      slug: schema.services.slug,
      name: schema.services.name,
      shortDesc: schema.services.shortDesc,
      imageKey: schema.services.imageKey,
      durationMin: schema.services.durationMin,
      aboutMd: schema.services.aboutMd,
      includedJson: schema.services.includedJson,
      notIncludedJson: schema.services.notIncludedJson,
      faqsJson: schema.services.faqsJson,
      categoryName: schema.categories.name,
      categorySlug: schema.categories.slug,
      fromPrice: minServicePrice,
    })
    .from(schema.services)
    .innerJoin(schema.categories, eq(schema.categories.id, schema.services.categoryId))
    .where(and(eq(schema.services.slug, slug), publiclyVisible))
    .limit(1);

  if (!row) return null;

  return {
    ...row,
    imageUrl: imageUrl(row.imageKey),
    fromPrice: row.fromPrice === null ? null : Number(row.fromPrice),
  };
}

/** Variable groups and options for the booking selector. */
export async function getServiceVariables(serviceId: number) {
  const d = db();
  const groups = await d
    .select({ id: schema.variableGroups.id, name: schema.variableGroups.name })
    .from(schema.variableGroups)
    .where(eq(schema.variableGroups.serviceId, serviceId))
    .orderBy(asc(schema.variableGroups.sort));

  return Promise.all(
    groups.map(async (group) => ({
      ...group,
      options: await d
        .select({ id: schema.variableOptions.id, label: schema.variableOptions.label })
        .from(schema.variableOptions)
        .where(eq(schema.variableOptions.groupId, group.id))
        .orderBy(asc(schema.variableOptions.sort)),
    })),
  );
}

export async function getServicePrices(serviceId: number) {
  return db()
    .select({ comboKey: schema.servicePrices.comboKey, price: schema.servicePrices.price })
    .from(schema.servicePrices)
    .where(eq(schema.servicePrices.serviceId, serviceId));
}

/**
 * Counts for the homepage stats band.
 *
 * Read live rather than hardcoded, so the band cannot claim ten services the
 * day someone adds an eleventh. Only active, undeleted rows count — advertising
 * a technician who has left, or a paused service, would be a false claim.
 */
export async function getCapabilityCounts(): Promise<{
  services: number;
  areas: number;
  technicians: number;
}> {
  const d = db();
  const [services] = await d
    .select({ n: sql<number>`count(*)` })
    .from(schema.services)
    .where(and(eq(schema.services.active, true), notDeleted(schema.services)));
  const [areas] = await d
    .select({ n: sql<number>`count(*)` })
    .from(schema.areas)
    .where(eq(schema.areas.active, true));
  const [technicians] = await d
    .select({ n: sql<number>`count(*)` })
    .from(schema.technicians)
    .where(and(eq(schema.technicians.active, true), notDeleted(schema.technicians)));

  return {
    services: Number(services?.n ?? 0),
    areas: Number(areas?.n ?? 0),
    technicians: Number(technicians?.n ?? 0),
  };
}
