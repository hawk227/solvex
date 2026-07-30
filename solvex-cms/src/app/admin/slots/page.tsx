import { asc, eq } from 'drizzle-orm';
import { schema } from '@solvex/db';
import { db } from '@/lib/cf';
import { requireView } from '@/lib/session';
import { Topbar, PageHeader } from '@/components/layout/page-header';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ActiveToggle } from '@/components/ui/active-toggle';
import { Table, TableWrap, Th, Td, Tr, EmptyRow } from '@/components/ui/table';
import { formatDate } from '@/lib/format';
import { SlotForm } from './slot-form';
import { CapacityOverrides } from './capacity-overrides';
import { setSlotActive } from './actions';

export const metadata = { title: 'Slots — SolveX Admin' };

export default async function SlotsPage() {
  await requireView('settings');
  const d = db();

  const [slots, overrides, defaultCapacity] = await Promise.all([
    d.select().from(schema.slotTemplates).orderBy(asc(schema.slotTemplates.sort)),
    d
      .select({
        date: schema.slotCapacity.date,
        slotId: schema.slotCapacity.slotId,
        capacity: schema.slotCapacity.capacity,
        label: schema.slotTemplates.label,
      })
      .from(schema.slotCapacity)
      .innerJoin(schema.slotTemplates, eq(schema.slotTemplates.id, schema.slotCapacity.slotId))
      .orderBy(asc(schema.slotCapacity.date)),
    d
      .select({ value: schema.settings.value })
      .from(schema.settings)
      .where(eq(schema.settings.key, 'default_slot_capacity')),
  ]);

  const fallback = Number.parseInt(defaultCapacity[0]?.value ?? '0', 10) || 0;

  return (
    <>
      <Topbar breadcrumb={['Admin', 'Slots']} />
      <main className="flex-1 p-6">
        <PageHeader
          title="Booking slots"
          subtitle={`${slots.length} slots · default capacity ${fallback} per slot per day`}
          actions={<SlotForm />}
        />

        <Card className="mb-6">
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Label</Th>
                  <Th>Window</Th>
                  <Th>Sort</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {slots.length === 0 && (
                  <EmptyRow colSpan={5}>
                    No slots yet. Customers cannot book until at least one slot is active.
                  </EmptyRow>
                )}
                {slots.map((slot) => (
                  <Tr key={slot.id}>
                    <Td className="font-medium">{slot.label}</Td>
                    <Td className="text-[var(--color-muted)]">
                      {slot.startTime} – {slot.endTime}
                    </Td>
                    <Td>{slot.sort}</Td>
                    <Td>
                      <Badge tone={slot.active ? 'success' : 'neutral'}>
                        {slot.active ? 'Bookable' : 'Closed'}
                      </Badge>
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-2">
                        <ActiveToggle
                          id={slot.id}
                          active={slot.active}
                          label={slot.label}
                          action={setSlotActive}
                        />
                        <SlotForm
                          slot={{
                            id: slot.id,
                            label: slot.label,
                            startTime: slot.startTime,
                            endTime: slot.endTime,
                            sort: slot.sort,
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

        <Card>
          <CardBody>
            <h2 className="text-base font-bold text-[var(--color-text)]">Capacity overrides</h2>
            <p className="mt-1 text-[13px] text-[var(--color-muted)]">
              Days without an override use the default of {fallback}. Set 0 to close a slot for a
              specific date, such as a public holiday.
            </p>
            <CapacityOverrides
              slots={slots.map((s) => ({ id: s.id, label: s.label }))}
              overrides={overrides.map((o) => ({ ...o, dateLabel: formatDate(o.date) }))}
              defaultCapacity={fallback}
            />
          </CardBody>
        </Card>
      </main>
    </>
  );
}
