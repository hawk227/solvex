'use client';

import { useMemo, useState } from 'react';
import { Select } from '@/components/ui/input';

export type GeographyForPicker = {
  zones: { id: number; name: string }[];
  areas: { id: number; name: string; zoneId: number | null }[];
  locations: { id: number; name: string; areaId: number }[];
};

const UNZONED = '__unzoned__';

/**
 * Zone → Area → Location, three selects that narrow each other.
 *
 * Zone is a pure filter: choosing one only shortens the Area list, it is never
 * submitted. Area is the field every booking, technician-coverage and capacity
 * check actually reads (see the schema note on `areas.zoneId`), so it is the
 * one required select and the one whose name the server action expects.
 * Location is the optional last step, submitted only if chosen.
 *
 * A picker rather than the flat area <select> it replaces, because eight areas
 * fit in one list comfortably and a few hundred locations will not — Zone
 * exists so Area stays short, and Area exists so Location does.
 */
export function AddressPicker({
  geography,
  initialAreaId,
  initialLocationId,
  /** Applied to the Area select, so an enclosing <Field label htmlFor> associates correctly. */
  areaSelectId,
}: {
  geography: GeographyForPicker;
  initialAreaId: number | null;
  initialLocationId: number | null;
  areaSelectId?: string;
}) {
  const initialArea = geography.areas.find((a) => a.id === initialAreaId);

  const [zoneFilter, setZoneFilter] = useState<string>(
    initialArea ? (initialArea.zoneId === null ? UNZONED : String(initialArea.zoneId)) : '',
  );
  const [areaId, setAreaId] = useState<string>(initialAreaId ? String(initialAreaId) : '');
  const [locationId, setLocationId] = useState<string>(
    initialLocationId ? String(initialLocationId) : '',
  );

  // Areas with no zone are real data, not a loading state — see the schema
  // note on areas.zoneId — so they get their own filterable bucket rather
  // than being hidden until an admin gets around to filing every one.
  const hasUnzoned = useMemo(() => geography.areas.some((a) => a.zoneId === null), [geography]);

  const visibleAreas = useMemo(() => {
    if (!zoneFilter) return geography.areas;
    if (zoneFilter === UNZONED) return geography.areas.filter((a) => a.zoneId === null);
    return geography.areas.filter((a) => a.zoneId === Number(zoneFilter));
  }, [geography.areas, zoneFilter]);

  const visibleLocations = useMemo(
    () => geography.locations.filter((l) => l.areaId === Number(areaId)),
    [geography.locations, areaId],
  );

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:gap-3">
      {geography.zones.length > 0 && (
        <div className="flex-1">
          <Select
            aria-label="Zone"
            value={zoneFilter}
            onChange={(e) => {
              const next = e.target.value;
              setZoneFilter(next);
              // Changing the zone invalidates whatever area was picked from a
              // different zone's list.
              const stillVisible =
                !next ||
                (next === UNZONED
                  ? geography.areas.find((a) => String(a.id) === areaId)?.zoneId === null
                  : geography.areas.find((a) => String(a.id) === areaId)?.zoneId ===
                    Number(next));
              if (!stillVisible) {
                setAreaId('');
                setLocationId('');
              }
            }}
          >
            <option value="">All zones</option>
            {geography.zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
            {hasUnzoned && <option value={UNZONED}>Other areas</option>}
          </Select>
        </div>
      )}

      <div className="flex-1">
        <Select
          id={areaSelectId}
          aria-label={areaSelectId ? undefined : 'Area'}
          name="areaId"
          required
          value={areaId}
          onChange={(e) => {
            setAreaId(e.target.value);
            // A location from the previous area would silently point at the
            // wrong place if left in place.
            setLocationId('');
          }}
        >
          <option value="" disabled>
            Choose your area
          </option>
          {visibleAreas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </Select>
      </div>

      {areaId && visibleLocations.length > 0 && (
        <div className="flex-1">
          <Select
            aria-label="Location (optional)"
            name="locationId"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
          >
            <option value="">Nearest neighbourhood (optional)</option>
            {visibleLocations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </Select>
        </div>
      )}
    </div>
  );
}
