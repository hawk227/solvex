import Link from 'next/link';
import { notFound } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { emptyGrid, getEmployee, schema } from '@solvex/db';
import { db } from '@/lib/cf';
import { requireOwner } from '@/lib/session';
import { Topbar, PageHeader } from '@/components/layout/page-header';
import { Card, CardBody } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format';
import { EmployeeAccessForm } from './access-form';

export default async function EmployeeDetailPage({ params }: PageProps<'/admin/employees/[id]'>) {
  const actor = await requireOwner();
  const { id } = await params;

  const employee = await getEmployee(db(), id);
  if (!employee) notFound();

  // Editing your own access is refused by the action too; this keeps the page
  // from presenting a form that can only fail.
  const isSelf = actor.id === employee.id;

  const audit = await db()
    .select()
    .from(schema.adminAudit)
    .where(eq(schema.adminAudit.subjectId, id))
    .orderBy(desc(schema.adminAudit.createdAt))
    .limit(20);

  return (
    <>
      <Topbar breadcrumb={['Admin', 'Employees', employee.name]} />
      <main className="flex-1 p-6">
        <PageHeader
          title={employee.name}
          subtitle={
            <>
              <Link href="/admin/employees" className="hover:underline">
                ← All employees
              </Link>
              {' · '}
              {employee.email}
            </>
          }
        />

        {isSelf ? (
          <Card>
            <CardBody>
              <p className="text-[13px] text-[var(--color-muted)]">
                You cannot change your own access. Another owner has to do it — that is what stops
                anyone from quietly granting themselves more than they were given.
              </p>
            </CardBody>
          </Card>
        ) : (
          <EmployeeAccessForm
            subjectId={employee.id}
            initialGrid={employee.isOwner ? emptyGrid() : employee.permissions}
            isOwner={employee.isOwner}
            active={employee.active}
            mustChangePassword={employee.mustChangePassword}
          />
        )}

        <Card className="mt-6">
          <CardBody>
            <h2 className="text-base font-bold text-[var(--color-text)]">Access history</h2>
            {audit.length === 0 ? (
              <p className="mt-3 text-[13px] text-[var(--color-muted)]">Nothing recorded yet.</p>
            ) : (
              <ol className="mt-4 flex flex-col gap-3">
                {audit.map((entry) => (
                  <li key={entry.id} className="flex gap-3">
                    <span
                      aria-hidden
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-primary)]"
                    />
                    <div>
                      <p className="text-[13px] font-medium">{entry.action}</p>
                      {entry.detail && (
                        <p className="text-xs text-[var(--color-muted)]">{entry.detail}</p>
                      )}
                      <p className="text-xs text-[var(--color-muted)]">
                        {formatDateTime(entry.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardBody>
        </Card>
      </main>
    </>
  );
}
