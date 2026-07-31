import { requireOwner } from '@/lib/session';
import { Topbar, PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableWrap, Th, Td, Tr, EmptyRow } from '@/components/ui/table';
import { RestoreButton } from '@/components/ui/delete-button';
import { formatDateTime } from '@/lib/format';
import { deleterNames, listDeleted } from '@/lib/deleted-queries';

export const metadata = { title: 'Deleted records — SolveX Admin' };

const KIND_LABEL: Record<string, string> = {
  category: 'Category',
  service: 'Service',
  technician: 'Technician',
  employee: 'Employee',
};

export default async function DeletedPage() {
  // Owner-only, matching the activity log: this is the same trail, and deleted
  // employee records name people who no longer work here.
  await requireOwner();

  const [rows, names] = await Promise.all([listDeleted(), deleterNames()]);

  return (
    <>
      <Topbar breadcrumb={['Admin', 'Deleted records']} />
      <main className="flex-1 p-6">
        <PageHeader
          title="Deleted records"
          subtitle="Nothing here has left the database. Past orders, tickets and the activity log still reference these records."
        />

        <Card>
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Type</Th>
                  <Th>Name</Th>
                  <Th>Deleted</Th>
                  <Th>By</Th>
                  <Th>{''}</Th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <EmptyRow colSpan={5}>Nothing has been deleted.</EmptyRow>
                ) : (
                  rows.map((row) => (
                    <Tr key={`${row.kind}-${row.id}`}>
                      <Td>
                        <Badge tone="neutral">{KIND_LABEL[row.kind] ?? row.kind}</Badge>
                      </Td>
                      <Td>
                        <span className="font-medium">{row.label}</span>
                        {row.detail && (
                          <span className="block text-xs text-[var(--color-muted)]">
                            {row.detail}
                          </span>
                        )}
                      </Td>
                      <Td>
                        <span className="whitespace-nowrap">{formatDateTime(row.deletedAt)}</span>
                      </Td>
                      <Td>
                        {row.deletedBy ? (names.get(row.deletedBy) ?? row.deletedBy) : '—'}
                      </Td>
                      <Td>
                        <RestoreButton kind={row.kind} id={row.id} label={row.label} />
                      </Td>
                    </Tr>
                  ))
                )}
              </tbody>
            </Table>
          </TableWrap>
        </Card>

        <p className="mt-4 text-[13px] text-[var(--color-muted)]">
          Restored records come back <strong>inactive</strong>, so nothing reappears on the public
          site until you switch it on again deliberately.
        </p>
      </main>
    </>
  );
}
