import { asc, eq } from 'drizzle-orm';
import type { Db } from './index';
import { areas, locations, zones } from './schema/customer';

export type GeographyZone = { id: number; name: string };
export type GeographyArea = { id: number; name: string; zoneId: number | null };
export type GeographyLocation = { id: number; name: string; areaId: number };

export type Geography = {
  zones: GeographyZone[];
  areas: GeographyArea[];
  locations: GeographyLocation[];
};

/**
 * The full active geography, flat, for the cascading picker.
 *
 * Flat rather than nested: the picker narrows one select at a time (pick a
 * zone, the area list filters to it, pick an area, the location list filters
 * to that), and three small arrays filtered client-side beat three round trips
 * or a deeply nested tree the UI has to unpack.
 *
 * zoneId on an area can be null — see the schema note on `areas.zoneId` — so
 * a picker built from this cannot assume every area is reachable by picking a
 * zone first. `isUnzoned` below is how a caller checks for that case.
 */
export async function getGeography(db: Db): Promise<Geography> {
  const [zoneRows, areaRows, locationRows] = await Promise.all([
    db
      .select({ id: zones.id, name: zones.name })
      .from(zones)
      .where(eq(zones.active, true))
      .orderBy(asc(zones.sort), asc(zones.name)),
    db
      .select({ id: areas.id, name: areas.name, zoneId: areas.zoneId })
      .from(areas)
      .where(eq(areas.active, true))
      .orderBy(asc(areas.sort), asc(areas.name)),
    db
      .select({ id: locations.id, name: locations.name, areaId: locations.areaId })
      .from(locations)
      .where(eq(locations.active, true))
      .orderBy(asc(locations.sort), asc(locations.name)),
  ]);

  return { zones: zoneRows, areas: areaRows, locations: locationRows };
}

/**
 * Areas with no zone are real — the starting eight predate zones and nothing
 * forces a value (see the schema note on `areas.zoneId`). Surfaced under a
 * synthetic "unzoned" bucket rather than hidden, so booking is never blocked
 * on an admin having got around to filing every area.
 */
export const UNZONED = '__unzoned__';

/** True for an area that has not been assigned a zone yet. */
export function isUnzoned(area: GeographyArea): boolean {
  return area.zoneId === null;
}
