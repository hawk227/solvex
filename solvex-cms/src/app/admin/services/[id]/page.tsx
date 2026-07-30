import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';
import { schema, buildComboKey, faqsToText, listToText } from '@solvex/db';
import { db, imageUrl } from '@/lib/cf';
import { canManage, requireView } from '@/lib/session';
import { Topbar, PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { ReadOnlyNotice } from '@/components/ui/read-only-notice';
import { Card, CardBody } from '@/components/ui/card';
import { ImageUpload } from '@/components/ui/image-upload';
import { Tabs } from '@/components/ui/tabs';
import { ContentEditor } from './content-editor';
import { VariablesEditor, type Group } from './variables-editor';
import { PriceMatrix, type MatrixRow } from './price-matrix';

export default async function ServiceDetailPage({ params }: PageProps<'/admin/services/[id]'>) {
  const employee = await requireView('catalog');
  const editable = canManage(employee, 'catalog');

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
              content: !editable ? (
                <>
                  <ReadOnlyNotice what="services" />
                  <div className="mt-5 flex flex-col gap-5 text-[13px]">
                    <div>
                      <p className="font-medium">About this service</p>
                      <p className="mt-1 whitespace-pre-line text-[var(--color-muted)]">
                        {service.aboutMd || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">What&rsquo;s included</p>
                      <p className="mt-1 whitespace-pre-line text-[var(--color-muted)]">
                        {listToText(service.includedJson) || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Not included</p>
                      <p className="mt-1 whitespace-pre-line text-[var(--color-muted)]">
                        {listToText(service.notIncludedJson) || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">FAQs</p>
                      <p className="mt-1 whitespace-pre-line text-[var(--color-muted)]">
                        {faqsToText(service.faqsJson) || '—'}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
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
              content: editable ? (
                <VariablesEditor serviceId={serviceId} groups={groups} />
              ) : (
                <>
                  <ReadOnlyNotice what="services" />
                  <ul className="mt-4 flex flex-col gap-2 text-[13px]">
                    {groups.length === 0 && (
                      <li className="text-[var(--color-muted)]">No variables.</li>
                    )}
                    {groups.map((g) => (
                      <li key={g.id}>
                        <span className="font-medium">{g.name}</span>
                        <span className="ml-2 text-[var(--color-muted)]">
                          {g.options.map((o) => o.label).join(', ') || 'no options'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ),
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
                  readOnly={!editable}
                />
              ),
            },
            {
              value: 'image',
              label: 'Image',
              content: (
                <Card>
                  <CardBody>
                    {!editable && <ReadOnlyNotice what="services" className="mb-4" />}
                    <ImageUpload
                      target="services"
                      id={serviceId}
                      imageUrl={imageUrl(service.imageKey)}
                      label={service.name}
                      readOnly={!editable}
                    />
                  </CardBody>
                </Card>
              ),
            },
          ]}
        />
      </main>
    </>
  );
}
