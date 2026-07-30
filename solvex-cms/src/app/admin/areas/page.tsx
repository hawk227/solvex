import { asc } from 'drizzle-orm';
import { schema } from '@solvex/db';
import { db } from '@/lib/cf';
import { requireView } from '@/lib/session';
import { Topbar, PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ActiveToggle } from '@/components/ui/active-toggle';
import { Table, TableWrap, Th, Td, Tr, EmptyRow } from '@/components/ui/table';
import { AreaForm } from './area-form';
import { setAreaActive } from './actions';

export const metadata = { title: 'Areas — SolveX Admin' };

export default async function AreasPage() {
  await requireView('settings');

  const rows = await db()
    .select()
    .from(schema.areas)
    .orderBy(asc(schema.areas.sort), asc(schema.areas.name));

  const activeCount = rows.filter((r) => r.active).length;

  return (
    <>
      <Topbar breadcrumb={['Admin', 'Areas']} />
      <main className="flex-1 p-6">
        <PageHeader
          title="Service areas"
          subtitle={`${rows.length} areas · ${activeCount} accepting bookings`}
          actions={<AreaForm />}
        />

        <Card>
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Area</Th>
                  <Th>Sort</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <EmptyRow colSpan={4}>
                    No service areas yet. Customers cannot book until at least one is active.
                  </EmptyRow>
                )}
                {rows.map((row) => (
                  <Tr key={row.id}>
                    <Td className="font-medium">{row.name}</Td>
                    <Td>{row.sort}</Td>
                    <Td>
                      <Badge tone={row.active ? 'success' : 'neutral'}>
                        {row.active ? 'Accepting' : 'Paused'}
                      </Badge>
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-2">
                        <ActiveToggle
                          id={row.id}
                          active={row.active}
                          label={row.name}
                          action={setAreaActive}
                        />
                        <AreaForm area={{ id: row.id, name: row.name, sort: row.sort }} />
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        </Card>
      </main>
    </>
  );
}
