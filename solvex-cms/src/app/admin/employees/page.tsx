import Link from 'next/link';
import { asc } from 'drizzle-orm';
import { PERMISSION_MODULES, schema } from '@solvex/db';
import { db } from '@/lib/cf';
import { requireOwner } from '@/lib/session';
import { Topbar, PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableWrap, Th, Td, Tr, EmptyRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format';
import { NewEmployeeForm } from './new-employee-form';

export const metadata = { title: 'Employees — SolveX Admin' };

export default async function EmployeesPage() {
  const actor = await requireOwner();
  const d = db();

  const [rows, grants] = await Promise.all([
    d
      .select({
        id: schema.adminUser.id,
        name: schema.adminUser.name,
        email: schema.adminUser.email,
        isOwner: schema.adminUser.isOwner,
        active: schema.adminUser.active,
        mustChangePassword: schema.adminUser.mustChangePassword,
        lastLoginAt: schema.adminUser.lastLoginAt,
      })
      .from(schema.adminUser)
      .orderBy(asc(schema.adminUser.name)),
    d.select().from(schema.adminPermissions),
  ]);

  const byUser = new Map<string, Map<string, string>>();
  for (const g of grants) {
    const m = byUser.get(g.adminUserId) ?? new Map();
    m.set(g.module, g.level);
    byUser.set(g.adminUserId, m);
  }

  function summarise(id: string, isOwner: boolean): string {
    if (isOwner) return 'Full access';
    const m = byUser.get(id);
    if (!m) return 'No access';
    const manage = PERMISSION_MODULES.filter((x) => m.get(x) === 'manage');
    const view = PERMISSION_MODULES.filter((x) => m.get(x) === 'view');
    if (manage.length === 0 && view.length === 0) return 'No access';
    return [
      manage.length > 0 ? `Manage: ${manage.join(', ')}` : null,
      view.length > 0 ? `View: ${view.join(', ')}` : null,
    ]
      .filter(Boolean)
      .join(' · ');
  }

  const activeOwners = rows.filter((r) => r.isOwner && r.active).length;

  return (
    <>
      <Topbar breadcrumb={['Admin', 'Employees']} />
      <main className="flex-1 p-6">
        <PageHeader
          title="Employees"
          subtitle={`${rows.length} accounts · ${activeOwners} owner${activeOwners === 1 ? '' : 's'}`}
          actions={<NewEmployeeForm />}
        />

        {activeOwners === 1 && (
          <Card className="mb-5 border-[var(--color-warning)]">
            <div className="p-4 text-[13px]">
              <strong className="text-[var(--color-warning)]">Only one owner.</strong> If you lose
              access to this account there is no way back in — there is no email-based reset. Make a
              second owner as a break-glass account.
            </div>
          </Card>
        )}

        <Card>
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Employee</Th>
                  <Th>Access</Th>
                  <Th>Status</Th>
                  <Th>Last sign-in</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && <EmptyRow colSpan={5}>No employees yet.</EmptyRow>}
                {rows.map((row) => (
                  <Tr key={row.id}>
                    <Td>
                      <div className="font-medium">
                        {row.name}
                        {row.id === actor.id && (
                          <span className="ml-2 text-xs text-[var(--color-muted)]">you</span>
                        )}
                      </div>
                      <div className="text-xs text-[var(--color-muted)]">{row.email}</div>
                    </Td>
                    <Td>
                      {row.isOwner ? (
                        <Badge tone="info">Owner</Badge>
                      ) : (
                        <span className="text-xs text-[var(--color-muted)]">
                          {summarise(row.id, row.isOwner)}
                        </span>
                      )}
                    </Td>
                    <Td>
                      {!row.active ? (
                        <Badge tone="neutral">Deactivated</Badge>
                      ) : row.mustChangePassword ? (
                        <Badge tone="warning">Temp password</Badge>
                      ) : (
                        <Badge tone="success">Active</Badge>
                      )}
                    </Td>
                    <Td className="text-xs text-[var(--color-muted)]">
                      {row.lastLoginAt ? formatDateTime(row.lastLoginAt) : 'Never'}
                    </Td>
                    <Td className="text-right">
                      {row.id === actor.id ? (
                        <span className="text-xs text-[var(--color-muted)]">
                          Cannot edit yourself
                        </span>
                      ) : (
                        <Link
                          href={`/admin/employees/${row.id}`}
                          className="text-[13px] text-[var(--color-primary)] hover:underline"
                        >
                          Manage access →
                        </Link>
                      )}
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
