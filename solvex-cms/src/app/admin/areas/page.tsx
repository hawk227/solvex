import { asc } from 'drizzle-orm';
import { schema } from '@solvex/db';
import { db } from '@/lib/cf';
import { canManage, requireView } from '@/lib/session';
import { Topbar, PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ActiveToggle } from '@/components/ui/active-toggle';
import { Tabs } from '@/components/ui/tabs';
import { Table, TableWrap, Th, Td, Tr, EmptyRow } from '@/components/ui/table';
import { AreaForm } from './area-form';
import { ZoneForm } from './zone-form';
import { LocationForm } from './location-form';
import { setAreaActive, setLocationActive, setZoneActive } from './actions';

export const metadata = { title: 'Areas — SolveX Admin' };

export default async function AreasPage() {
  const employee = await requireView('settings');
  const editable = canManage(employee, 'settings');

  const [zoneRows, areaRows, locationRows] = await Promise.all([
    db().select().from(schema.zones).orderBy(asc(schema.zones.sort), asc(schema.zones.name)),
    db().select().from(schema.areas).orderBy(asc(schema.areas.sort), asc(schema.areas.name)),
    db()
      .select()
      .from(schema.locations)
      .orderBy(asc(schema.locations.sort), asc(schema.locations.name)),
  ]);

  const zoneName = new Map(zoneRows.map((z) => [z.id, z.name]));
  const areaName = new Map(areaRows.map((a) => [a.id, a.name]));
  const zoneOptions = zoneRows.map((z) => ({ id: z.id, name: z.name }));
  const areaOptions = areaRows.map((a) => ({ id: a.id, name: a.name }));

  const unzonedCount = areaRows.filter((a) => a.zoneId === null).length;

  return (
    <>
      <Topbar breadcrumb={['Admin', 'Areas']} />
      <main className="flex-1 p-6">
        <PageHeader
          title="Service geography"
          subtitle={`${zoneRows.length} zones · ${areaRows.length} areas · ${locationRows.length} locations`}
        />

        {unzonedCount > 0 && (
          <p className="mb-4 text-[13px] text-[var(--color-muted)]">
            {unzonedCount} {unzonedCount === 1 ? 'area has' : 'areas have'} no zone assigned yet.
            Booking still works from these — zone is organisational only.
          </p>
        )}

        <Card>
          <div className="p-5">
            <Tabs
              tabs={[
                {
                  value: 'zones',
                  label: `Zones (${zoneRows.length})`,
                  content: <ZonesTable rows={zoneRows} editable={editable} />,
                },
                {
                  value: 'areas',
                  label: `Areas (${areaRows.length})`,
                  content: (
                    <AreasTable
                      rows={areaRows}
                      zoneName={zoneName}
                      zoneOptions={zoneOptions}
                      editable={editable}
                    />
                  ),
                },
                {
                  value: 'locations',
                  label: `Locations (${locationRows.length})`,
                  content: (
                    <LocationsTable
                      rows={locationRows}
                      areaName={areaName}
                      areaOptions={areaOptions}
                      editable={editable}
                    />
                  ),
                },
              ]}
            />
          </div>
        </Card>
      </main>
    </>
  );
}

type ZoneRowData = typeof schema.zones.$inferSelect;
type AreaRowData = typeof schema.areas.$inferSelect;
type LocationRowData = typeof schema.locations.$inferSelect;

function ZonesTable({ rows, editable }: { rows: ZoneRowData[]; editable: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">{editable && <ZoneForm />}</div>
      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th>Zone</Th>
              <Th>Sort</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <EmptyRow colSpan={4}>
                No zones yet. Zones are optional — areas work without one.
              </EmptyRow>
            )}
            {rows.map((row) => (
              <Tr key={row.id}>
                <Td className="font-medium">{row.name}</Td>
                <Td>{row.sort}</Td>
                <Td>
                  <Badge tone={row.active ? 'success' : 'neutral'}>
                    {row.active ? 'Active' : 'Hidden'}
                  </Badge>
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-2">
                    {editable ? (
                      <>
                        <ActiveToggle
                          id={row.id}
                          active={row.active}
                          label={row.name}
                          action={setZoneActive}
                        />
                        <ZoneForm zone={{ id: row.id, name: row.name, sort: row.sort }} />
                      </>
                    ) : (
                      <span className="text-xs text-[var(--color-muted)]">View only</span>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
    </div>
  );
}

function AreasTable({
  rows,
  zoneName,
  zoneOptions,
  editable,
}: {
  rows: AreaRowData[];
  zoneName: Map<number, string>;
  zoneOptions: { id: number; name: string }[];
  editable: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">{editable && <AreaForm zones={zoneOptions} />}</div>
      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th>Area</Th>
              <Th>Zone</Th>
              <Th>Sort</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <EmptyRow colSpan={5}>
                No service areas yet. Customers cannot book until at least one is active.
              </EmptyRow>
            )}
            {rows.map((row) => (
              <Tr key={row.id}>
                <Td className="font-medium">{row.name}</Td>
                <Td>
                  {row.zoneId ? (
                    (zoneName.get(row.zoneId) ?? '—')
                  ) : (
                    <span className="text-[var(--color-muted)]">Unassigned</span>
                  )}
                </Td>
                <Td>{row.sort}</Td>
                <Td>
                  <Badge tone={row.active ? 'success' : 'neutral'}>
                    {row.active ? 'Accepting' : 'Paused'}
                  </Badge>
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-2">
                    {editable ? (
                      <>
                        <ActiveToggle
                          id={row.id}
                          active={row.active}
                          label={row.name}
                          action={setAreaActive}
                        />
                        <AreaForm
                          zones={zoneOptions}
                          area={{
                            id: row.id,
                            name: row.name,
                            zoneId: row.zoneId,
                            sort: row.sort,
                          }}
                        />
                      </>
                    ) : (
                      <span className="text-xs text-[var(--color-muted)]">View only</span>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
    </div>
  );
}

function LocationsTable({
  rows,
  areaName,
  areaOptions,
  editable,
}: {
  rows: LocationRowData[];
  areaName: Map<number, string>;
  areaOptions: { id: number; name: string }[];
  editable: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        {editable &&
          (areaOptions.length > 0 ? (
            <LocationForm areas={areaOptions} />
          ) : (
            <p className="text-[13px] text-[var(--color-muted)]">
              Add an area first — a location must belong to one.
            </p>
          ))}
      </div>
      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th>Location</Th>
              <Th>Area</Th>
              <Th>Sort</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <EmptyRow colSpan={5}>
                No locations yet. Optional — the address picker still works down to Area without
                them.
              </EmptyRow>
            )}
            {rows.map((row) => (
              <Tr key={row.id}>
                <Td className="font-medium">{row.name}</Td>
                <Td>{areaName.get(row.areaId) ?? '—'}</Td>
                <Td>{row.sort}</Td>
                <Td>
                  <Badge tone={row.active ? 'success' : 'neutral'}>
                    {row.active ? 'Active' : 'Hidden'}
                  </Badge>
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-2">
                    {editable ? (
                      <>
                        <ActiveToggle
                          id={row.id}
                          active={row.active}
                          label={row.name}
                          action={setLocationActive}
                        />
                        <LocationForm
                          areas={areaOptions}
                          location={{
                            id: row.id,
                            name: row.name,
                            areaId: row.areaId,
                            sort: row.sort,
                          }}
                        />
                      </>
                    ) : (
                      <span className="text-xs text-[var(--color-muted)]">View only</span>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
    </div>
  );
}
