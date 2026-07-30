import Link from 'next/link';
import { asc, count, eq } from 'drizzle-orm';
import { schema } from '@solvex/db';
import { db, imageUrl } from '@/lib/cf';
import { requireAdmin } from '@/lib/session';
import { Topbar, PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { ImageUpload } from '@/components/ui/image-upload';
import { Badge } from '@/components/ui/badge';
import { Table, TableWrap, Th, Td, Tr, EmptyRow } from '@/components/ui/table';
import { CategoryForm } from './category-form';
import { ActiveToggle } from '@/components/ui/active-toggle';
import { setCategoryActive } from './actions';

export const metadata = { title: 'Categories — SolveX Admin' };

export default async function CategoriesPage() {
  await requireAdmin();

  const rows = await db()
    .select({
      id: schema.categories.id,
      slug: schema.categories.slug,
      name: schema.categories.name,
      description: schema.categories.description,
      sort: schema.categories.sort,
      active: schema.categories.active,
      imageKey: schema.categories.imageKey,
      services: count(schema.services.id),
    })
    .from(schema.categories)
    .leftJoin(schema.services, eq(schema.services.categoryId, schema.categories.id))
    .groupBy(schema.categories.id)
    .orderBy(asc(schema.categories.sort), asc(schema.categories.name));

  const activeCount = rows.filter((r) => r.active).length;

  return (
    <>
      <Topbar breadcrumb={['Admin', 'Categories']} />
      <main className="flex-1 p-6">
        <PageHeader
          title="Categories"
          subtitle={`${rows.length} total · ${activeCount} active`}
          actions={<CategoryForm />}
        />

        <Card>
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Image</Th>
                  <Th>Name</Th>
                  <Th>Slug</Th>
                  <Th>Services</Th>
                  <Th>Sort</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <EmptyRow colSpan={7}>
                    No categories yet. Add one to start building the catalog.
                  </EmptyRow>
                )}
                {rows.map((row) => (
                  <Tr key={row.id}>
                    <Td>
                      <ImageUpload
                        target="categories"
                        id={row.id}
                        imageUrl={imageUrl(row.imageKey)}
                        label={row.name}
                        compact
                      />
                    </Td>
                    <Td>
                      <div className="font-medium">{row.name}</div>
                      {row.description && (
                        <div className="mt-0.5 max-w-[42ch] truncate text-xs text-[var(--color-muted)]">
                          {row.description}
                        </div>
                      )}
                    </Td>
                    <Td>
                      <code className="rounded-[var(--radius-sm)] bg-[var(--color-surface)] px-2 py-1 text-xs text-[var(--color-muted)]">
                        {row.slug}
                      </code>
                    </Td>
                    <Td>
                      <Link
                        href={`/admin/services?category=${row.id}`}
                        className="text-[var(--color-primary)] hover:underline"
                      >
                        {row.services}
                      </Link>
                    </Td>
                    <Td>{row.sort}</Td>
                    <Td>
                      <Badge tone={row.active ? 'success' : 'neutral'}>
                        {row.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-2">
                        <ActiveToggle
                          id={row.id}
                          active={row.active}
                          label={row.name}
                          action={setCategoryActive}
                        />
                        <CategoryForm
                          category={{
                            id: row.id,
                            name: row.name,
                            description: row.description,
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
