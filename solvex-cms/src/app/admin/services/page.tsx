import Link from 'next/link';
import { asc, eq } from 'drizzle-orm';
import { schema, servicePriceCount, variableGroupCount } from '@solvex/db';
import { db } from '@/lib/cf';
import { canManage, requireView } from '@/lib/session';
import { Topbar, PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ActiveToggle } from '@/components/ui/active-toggle';
import { Table, TableWrap, Th, Td, Tr, EmptyRow } from '@/components/ui/table';
import { ServiceForm } from './service-form';
import { setServiceActive } from './actions';

export const metadata = { title: 'Services — SolveX Admin' };

export default async function ServicesPage() {
  const employee = await requireView('catalog');
  const editable = canManage(employee, 'catalog');
  const d = db();

  const [categories, rows] = await Promise.all([
    d
      .select({ id: schema.categories.id, name: schema.categories.name })
      .from(schema.categories)
      .orderBy(asc(schema.categories.sort), asc(schema.categories.name)),
    d
      .select({
        id: schema.services.id,
        name: schema.services.name,
        slug: schema.services.slug,
        shortDesc: schema.services.shortDesc,
        categoryId: schema.services.categoryId,
        categoryName: schema.categories.name,
        durationMin: schema.services.durationMin,
        sort: schema.services.sort,
        active: schema.services.active,
        priceCount: servicePriceCount,
        groupCount: variableGroupCount,
        aboutMd: schema.services.aboutMd,
        includedJson: schema.services.includedJson,
        notIncludedJson: schema.services.notIncludedJson,
        faqsJson: schema.services.faqsJson,
      })
      .from(schema.services)
      .innerJoin(schema.categories, eq(schema.categories.id, schema.services.categoryId))
      .orderBy(asc(schema.categories.sort), asc(schema.services.sort), asc(schema.services.name)),
  ]);

  const activeCount = rows.filter((r) => r.active).length;

  return (
    <>
      <Topbar breadcrumb={['Admin', 'Services']} />
      <main className="flex-1 p-6">
        <PageHeader
          title="Services"
          subtitle={`${rows.length} total · ${activeCount} active`}
          actions={editable ? <ServiceForm categories={categories} /> : null}
        />

        {categories.length === 0 && (
          <Card className="mb-6">
            <div className="p-6 text-[13px] text-[var(--color-muted)]">
              Create a{' '}
              <Link href="/admin/categories" className="text-[var(--color-primary)] hover:underline">
                category
              </Link>{' '}
              before adding services.
            </div>
          </Card>
        )}

        <Card>
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Service</Th>
                  <Th>Category</Th>
                  <Th>Content</Th>
                  <Th>Pricing</Th>
                  <Th>Duration</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <EmptyRow colSpan={7}>No services yet.</EmptyRow>
                )}
                {rows.map((row) => (
                  <Tr key={row.id}>
                    <Td>
                      <Link
                        href={`/admin/services/${row.id}`}
                        className="font-medium hover:text-[var(--color-primary)] hover:underline"
                      >
                        {row.name}
                      </Link>
                      {row.shortDesc && (
                        <div className="mt-0.5 max-w-[42ch] truncate text-xs text-[var(--color-muted)]">
                          {row.shortDesc}
                        </div>
                      )}
                    </Td>
                    <Td className="text-[var(--color-muted)]">{row.categoryName}</Td>
                    <Td>
                      {(() => {
                        const filled = [
                          Boolean(row.aboutMd),
                          (row.includedJson?.length ?? 0) > 0,
                          (row.notIncludedJson?.length ?? 0) > 0,
                          (row.faqsJson?.length ?? 0) > 0,
                        ].filter(Boolean).length;
                        return (
                          <Link
                            href={`/admin/services/${row.id}`}
                            className="hover:underline"
                            title="About, What's included, Not included, FAQs"
                          >
                            <Badge tone={filled === 4 ? 'success' : filled === 0 ? 'danger' : 'warning'}>
                              {filled} of 4 sections
                            </Badge>
                          </Link>
                        );
                      })()}
                    </Td>
                    <Td>
                      {row.priceCount === 0 ? (
                        <Badge tone="danger">Unpriced</Badge>
                      ) : (
                        <span className="text-[var(--color-muted)]">
                          {row.priceCount} {row.priceCount === 1 ? 'price' : 'prices'}
                          {row.groupCount > 0 && ` · ${row.groupCount} variables`}
                        </span>
                      )}
                    </Td>
                    <Td className="text-[var(--color-muted)]">
                      {row.durationMin ? `${row.durationMin} min` : '—'}
                    </Td>
                    <Td>
                      <Badge tone={row.active ? 'success' : 'neutral'}>
                        {row.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/services/${row.id}`}
                          className="text-xs text-[var(--color-primary)] hover:underline"
                        >
                          Edit content
                        </Link>
                        {editable && (
                          <ActiveToggle
                            id={row.id}
                            active={row.active}
                            label={row.name}
                            action={setServiceActive}
                          />
                        )}
                        <ServiceForm
                          categories={categories}
                          service={{
                            id: row.id,
                            categoryId: row.categoryId,
                            name: row.name,
                            shortDesc: row.shortDesc,
                            durationMin: row.durationMin,
                            sort: row.sort,
                          }}
                        />
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
