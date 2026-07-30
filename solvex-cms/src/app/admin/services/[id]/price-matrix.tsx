'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableWrap, Th, Td, Tr } from '@/components/ui/table';
import { formatTaka } from '@/lib/format';
import { bulkFillPrices, clearPrice, setPrice } from './price-actions';

export type MatrixRow = {
  comboKey: string;
  /** One label per variable group, in group order. */
  labels: string[];
  price: number | null;
};

export function PriceMatrix({
  serviceId,
  groupNames,
  rows,
  blocked,
}: {
  serviceId: number;
  groupNames: string[];
  rows: MatrixRow[];
  blocked: boolean;
}) {
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [busy, startBusy] = useTransition();
  const [pending, setPending] = useState(false);

  const unpriced = rows.filter((r) => r.price === null).length;

  async function onBulkFill(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    setNotice(undefined);

    const result = await bulkFillPrices(serviceId, new FormData(e.currentTarget));

    setPending(false);
    if (!result.ok) return setError(result.error);
    setNotice(`Updated ${result.written ?? 0} ${result.written === 1 ? 'price' : 'prices'}.`);
  }

  async function onSetOne(comboKey: string, form: HTMLFormElement) {
    setError(undefined);
    setNotice(undefined);
    const value = new FormData(form).get('price');
    const result = await setPrice(serviceId, comboKey, value);
    if (!result.ok) setError(result.error);
  }

  if (blocked) {
    return (
      <Card>
        <CardBody>
          <p className="text-[13px] text-[var(--color-muted)]">
            Every variable group needs at least one option before prices can be set.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardBody>
          <h3 className="text-[13px] font-bold text-[var(--color-text)]">Bulk fill</h3>
          <p className="mt-1 text-[13px] text-[var(--color-muted)]">
            Set one price across the matrix, then override the exceptions by hand.
          </p>

          <form onSubmit={onBulkFill} className="mt-4 flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="bulk-price">Price (৳)</Label>
              <Input
                id="bulk-price"
                name="price"
                type="number"
                min={0}
                step={1}
                required
                className="w-40"
                placeholder="1500"
              />
            </div>

            <label className="flex h-[var(--cms-input-height)] items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                name="onlyEmpty"
                defaultChecked
                className="h-4 w-4 accent-[var(--color-primary)]"
              />
              Only fill combinations that have no price yet
            </label>

            <Button type="submit" disabled={pending}>
              {pending ? 'Filling…' : 'Apply'}
            </Button>
          </form>

          {error && (
            <p role="alert" className="mt-3 text-[13px] text-[var(--color-danger)]">
              {error}
            </p>
          )}
          {notice && !error && (
            <p role="status" className="mt-3 text-[13px] text-[var(--color-success)]">
              {notice}
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 pb-2 pt-5">
          <h3 className="text-[13px] font-bold text-[var(--color-text)]">
            {rows.length} {rows.length === 1 ? 'combination' : 'combinations'}
          </h3>
          {unpriced > 0 ? (
            <Badge tone="danger">{unpriced} unpriced — not bookable</Badge>
          ) : (
            <Badge tone="success">All combinations priced</Badge>
          )}
        </div>

        <TableWrap>
          <Table>
            <thead>
              <tr>
                {groupNames.length === 0 ? (
                  <Th>Service</Th>
                ) : (
                  groupNames.map((name) => <Th key={name}>{name}</Th>)
                )}
                <Th>Price</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <Tr key={row.comboKey || 'base'}>
                  {row.labels.length === 0 ? (
                    <Td className="text-[var(--color-muted)]">Single price</Td>
                  ) : (
                    row.labels.map((label, i) => (
                      <Td key={`${row.comboKey}-${i}`} className="font-medium">
                        {label}
                      </Td>
                    ))
                  )}
                  <Td>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void onSetOne(row.comboKey, e.currentTarget);
                      }}
                      className="flex items-center gap-2"
                    >
                      <Input
                        name="price"
                        type="number"
                        min={0}
                        step={1}
                        defaultValue={row.price ?? ''}
                        placeholder="Unpriced"
                        aria-label={`Price for ${row.labels.join(', ') || 'this service'}`}
                        className="w-32"
                      />
                      <Button type="submit" variant="secondary" size="sm">
                        Save
                      </Button>
                      {row.price !== null && (
                        <span className="text-xs text-[var(--color-muted)]">
                          {formatTaka(row.price)}
                        </span>
                      )}
                    </form>
                  </Td>
                  <Td className="text-right">
                    {row.price !== null && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => startBusy(() => void clearPrice(serviceId, row.comboKey))}
                      >
                        Clear
                      </Button>
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      </Card>
    </div>
  );
}
