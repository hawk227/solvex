'use client';

import { useMemo, useState } from 'react';
import type { Geography } from '@solvex/db';

const UNZONED = '__unzoned__';
const SELECT_CLASS =
  'h-[var(--cms-input-height)] rounded-[var(--cms-control-radius)] border border-[var(--color-border)] ' +
  'bg-[var(--color-input-bg)] px-3 text-[13px] text-[var(--color-text)]';

/**
 * Zone → Area → Location, three selects that narrow each other. Ported from
 * the webapp's AddressPicker (solvex-webapp/src/components/ui/address-picker.tsx)
 * for the CMS's walk-in "new customer" form. There is no shared UI package
 * between the two Next apps — see the "CMS changes" section of
 * docs/superpowers/specs/2026-08-08-cms-order-creation-design.md for why this
 * one small duplication is accepted rather than introducing one.
 */
export function AddressPicker({
  geography,
  initialAreaId,
  initialLocationId,
  areaSelectId,
}: {
  geography: Geography;
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
    <div className="flex flex-col gap-3 sm:flex-row">
      {geography.zones.length > 0 && (
        <select
          aria-label="Zone"
          className={`flex-1 ${SELECT_CLASS}`}
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
                : geography.areas.find((a) => String(a.id) === areaId)?.zoneId === Number(next));
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
        </select>
      )}

      <select
        id={areaSelectId}
        aria-label={areaSelectId ? undefined : 'Area'}
        name="areaId"
        required
        className={`flex-1 ${SELECT_CLASS}`}
        value={areaId}
        onChange={(e) => {
          setAreaId(e.target.value);
          // A location from the previous area would silently point at the
          // wrong place if left in place.
          setLocationId('');
        }}
      >
        <option value="" disabled>
          Choose an area
        </option>
        {visibleAreas.map((area) => (
          <option key={area.id} value={area.id}>
            {area.name}
          </option>
        ))}
      </select>

      {areaId && visibleLocations.length > 0 && (
        <select
          aria-label="Location (optional)"
          name="locationId"
          className={`flex-1 ${SELECT_CLASS}`}
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
        >
          <option value="">Nearest neighbourhood (optional)</option>
          {visibleLocations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
