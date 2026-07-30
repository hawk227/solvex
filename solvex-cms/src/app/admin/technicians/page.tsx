import { asc, eq, sql } from 'drizzle-orm';
import { schema } from '@solvex/db';
import { db } from '@/lib/cf';
import { requireAdmin } from '@/lib/session';
import { Topbar, PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ActiveToggle } from '@/components/ui/active-toggle';
import { Table, TableWrap, Th, Td, Tr, EmptyRow } from '@/components/ui/table';
import { formatBdMobile } from '@/lib/phone';
import { TechnicianForm } from './technician-form';
import { setTechnicianActive } from './actions';

export const metadata = { title: 'Technicians — SolveX Admin' };

export default async function TechniciansPage() {
  await requireAdmin();
  const d = db();

  // Table-qualified SQL text: interpolating Drizzle columns into a raw template
  // emits them unqualified and resolves against the wrong table in a subquery.
  const openJobs = sql<number>`(
    SELECT count(*) FROM orders
    WHERE orders.technician_id = technicians.id
      AND orders.status IN ('PENDING','APPROVED','ON_THE_WAY','IN_PROGRESS')
  )`;
  const doneJobs = sql<number>`(
    SELECT count(*) FROM orders
    WHERE orders.technician_id = technicians.id AND orders.status = 'COMPLETED'
  )`;

  const [rows, categories, areas, skillRows, areaRows] = await Promise.all([
    d
      .select({
        id: schema.technicians.id,
        fullName: schema.technicians.fullName,
        phone: schema.technicians.phone,
        email: schema.technicians.email,
        baseArea: schema.technicians.baseArea,
        joinedOn: schema.technicians.joinedOn,
        notes: schema.technicians.notes,
        active: schema.technicians.active,
        openJobs,
        doneJobs,
      })
      .from(schema.technicians)
      .orderBy(asc(schema.technicians.fullName)),
    d
      .select({ id: schema.categories.id, name: schema.categories.name })
      .from(schema.categories)
      .where(eq(schema.categories.active, true))
      .orderBy(asc(schema.categories.sort)),
    d
      .select({ id: schema.areas.id, name: schema.areas.name })
      .from(schema.areas)
      .where(eq(schema.areas.active, true))
      .orderBy(asc(schema.areas.sort)),
    d
      .select({
        technicianId: schema.technicianSkills.technicianId,
        categoryId: schema.technicianSkills.categoryId,
        name: schema.categories.name,
      })
      .from(schema.technicianSkills)
      .innerJoin(schema.categories, eq(schema.categories.id, schema.technicianSkills.categoryId)),
    d
      .select({
        technicianId: schema.technicianAreas.technicianId,
        areaId: schema.technicianAreas.areaId,
        name: schema.areas.name,
      })
      .from(schema.technicianAreas)
      .innerJoin(schema.areas, eq(schema.areas.id, schema.technicianAreas.areaId)),
  ]);

  const skillsBy = new Map<number, { id: number; name: string }[]>();
  for (const r of skillRows) {
    const list = skillsBy.get(r.technicianId) ?? [];
    list.push({ id: r.categoryId, name: r.name });
    skillsBy.set(r.technicianId, list);
  }

  const areasBy = new Map<number, { id: number; name: string }[]>();
  for (const r of areaRows) {
    const list = areasBy.get(r.technicianId) ?? [];
    list.push({ id: r.areaId, name: r.name });
    areasBy.set(r.technicianId, list);
  }

  const activeCount = rows.filter((r) => r.active).length;

  return (
    <>
      <Topbar breadcrumb={['Admin', 'Technicians']} />
      <main className="flex-1 p-6">
        <PageHeader
          title="Technicians"
          subtitle={`${rows.length} on the books · ${activeCount} on the rota`}
          actions={<TechnicianForm categories={categories} areas={areas} />}
        />

        <Card>
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Technician</Th>
                  <Th>Skills</Th>
                  <Th>Areas covered</Th>
                  <Th>Workload</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <EmptyRow colSpan={6}>
                    No technicians yet. Onboard one to start assigning jobs.
                  </EmptyRow>
                )}
                {rows.map((row) => {
                  const skills = skillsBy.get(row.id) ?? [];
                  const covered = areasBy.get(row.id) ?? [];
                  return (
                    <Tr key={row.id}>
                      <Td>
                        <div className="font-medium">{row.fullName}</div>
                        <div className="text-xs text-[var(--color-muted)]">
                          {formatBdMobile(row.phone)}
                        </div>
                        {row.baseArea && (
                          <div className="text-xs text-[var(--color-muted)]">
                            Based in {row.baseArea}
                          </div>
                        )}
                      </Td>
                      <Td>
                        {skills.length === 0 ? (
                          <span className="text-xs text-[var(--color-muted)]">Not set</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {skills.map((s) => (
                              <span
                                key={s.id}
                                className="rounded-[var(--radius-pill)] bg-[var(--color-surface)] px-2 py-0.5 text-xs"
                              >
                                {s.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </Td>
                      <Td>
                        {covered.length === 0 ? (
                          <span className="text-xs text-[var(--color-muted)]">Not set</span>
                        ) : (
                          <span className="text-xs">{covered.map((a) => a.name).join(', ')}</span>
                        )}
                      </Td>
                      <Td>
                        <div className="font-medium">{Number(row.openJobs)} open</div>
                        <div className="text-xs text-[var(--color-muted)]">
                          {Number(row.doneJobs)} completed
                        </div>
                      </Td>
                      <Td>
                        <Badge tone={row.active ? 'success' : 'neutral'}>
                          {row.active ? 'On rota' : 'Off rota'}
                        </Badge>
                      </Td>
                      <Td>
                        <div className="flex items-center justify-end gap-2">
                          <ActiveToggle
                            id={row.id}
                            active={row.active}
                            label={row.fullName}
                            action={setTechnicianActive}
                          />
                          <TechnicianForm
                            categories={categories}
                            areas={areas}
                            technician={{
                              id: row.id,
                              fullName: row.fullName,
                              phone: row.phone,
                              email: row.email,
                              baseArea: row.baseArea,
                              joinedOn: row.joinedOn,
                              notes: row.notes,
                              categoryIds: skills.map((s) => s.id),
                              areaIds: covered.map((a) => a.id),
                            }}
                          />
                        </div>
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          </TableWrap>
        </Card>

        <p className="mt-4 text-xs text-[var(--color-muted)]">
          Technicians are never deleted — turning someone off the rota keeps them on the jobs they
          already did while stopping new assignments.
        </p>
      </main>
    </>
  );
}
