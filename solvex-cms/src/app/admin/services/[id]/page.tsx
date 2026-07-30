import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';
import { schema, buildComboKey, faqsToText, listToText } from '@solvex/db';
import { db } from '@/lib/cf';
import { requireAdmin } from '@/lib/session';
import { Topbar, PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Tabs } from '@/components/ui/tabs';
import { ContentEditor } from './content-editor';
import { VariablesEditor, type Group } from './variables-editor';
import { PriceMatrix, type MatrixRow } from './price-matrix';

export default async function ServiceDetailPage({ params }: PageProps<'/admin/services/[id]'>) {
  await requireAdmin();

  // Next 16: params is a Promise.
  const { id } = await params;
  const serviceId = Number.parseInt(id, 10);
  if (Number.isNaN(serviceId)) notFound();

  const d = db();
  const service = await d.query.services.findFirst({ where: eq(schema.services.id, serviceId) });
  if (!service) notFound();

  const [category, rawGroups, prices] = await Promise.all([
    d.query.categories.findFirst({ where: eq(schema.categories.id, service.categoryId) }),
    d
      .select()
      .from(schema.variableGroups)
      .where(eq(schema.variableGroups.serviceId, serviceId))
      .orderBy(asc(schema.variableGroups.sort)),
    d.select().from(schema.servicePrices).where(eq(schema.servicePrices.serviceId, serviceId)),
  ]);

  const groups: Group[] = await Promise.all(
    rawGroups.map(async (g) => ({
      id: g.id,
      name: g.name,
      options: await d
        .select({ id: schema.variableOptions.id, label: schema.variableOptions.label })
        .from(schema.variableOptions)
        .where(eq(schema.variableOptions.groupId, g.id))
        .orderBy(asc(schema.variableOptions.sort)),
    })),
  );

  const priceByKey = new Map(prices.map((p) => [p.comboKey, p.price]));
  const blocked = groups.length > 0 && groups.some((g) => g.options.length === 0);

  // Build the matrix rows with their human labels alongside the combo key, so
  // the table can show "1.5 Ton / Split" rather than raw option ids.
  let rows: MatrixRow[] = [];
  if (!blocked) {
    let acc: { ids: number[]; labels: string[] }[] = [{ ids: [], labels: [] }];
    for (const group of groups) {
      const next: typeof acc = [];
      for (const partial of acc) {
        for (const option of group.options) {
          next.push({ ids: [...partial.ids, option.id], labels: [...partial.labels, option.label] });
        }
      }
      acc = next;
    }
    rows = acc.map((combo) => {
      const comboKey = buildComboKey(combo.ids);
      return { comboKey, labels: combo.labels, price: priceByKey.get(comboKey) ?? null };
    });
  }

  const unpriced = rows.filter((r) => r.price === null).length;

  return (
    <>
      <Topbar breadcrumb={['Admin', 'Services', service.name]} />
      <main className="flex-1 p-6">
        <PageHeader
          title={service.name}
          subtitle={
            <>
              <Link href="/admin/services" className="hover:underline">
                ← All services
              </Link>
              {' · '}
              {category?.name}
              {' · '}
              <code>{service.slug}</code>
            </>
          }
          actions={
            unpriced > 0 ? (
              <Badge tone="danger">{unpriced} unpriced</Badge>
            ) : (
              <Badge tone="success">Ready to book</Badge>
            )
          }
        />

        <Tabs
          tabs={[
            {
              value: 'content',
              label: 'Content',
              content: (
                <ContentEditor
                  serviceId={serviceId}
                  aboutMd={service.aboutMd ?? ''}
                  includedText={listToText(service.includedJson)}
                  notIncludedText={listToText(service.notIncludedJson)}
                  faqsText={faqsToText(service.faqsJson)}
                />
              ),
            },
            {
              value: 'variables',
              label: `Variables${groups.length ? ` (${groups.length})` : ''}`,
              content: <VariablesEditor serviceId={serviceId} groups={groups} />,
            },
            {
              value: 'pricing',
              label: `Pricing${rows.length ? ` (${rows.length})` : ''}`,
              content: (
                <PriceMatrix
                  serviceId={serviceId}
                  groupNames={groups.map((g) => g.name)}
                  rows={rows}
                  blocked={blocked}
                />
              ),
            },
          ]}
        />
      </main>
    </>
  );
}
