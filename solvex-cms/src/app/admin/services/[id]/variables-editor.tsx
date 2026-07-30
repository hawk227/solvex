'use client';

import { useRef, useState, useTransition, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardBody } from '@/components/ui/card';
import {
  addVariableGroup,
  addVariableOption,
  deleteVariableGroup,
  deleteVariableOption,
} from './variable-actions';

export type Group = {
  id: number;
  name: string;
  options: { id: number; label: string }[];
};

export function VariablesEditor({ serviceId, groups }: { serviceId: number; groups: Group[] }) {
  const [error, setError] = useState<string>();
  const [busy, startBusy] = useTransition();
  const groupForm = useRef<HTMLFormElement>(null);

  const combinationCount = groups.length
    ? groups.reduce((n, g) => n * Math.max(g.options.length, 0), 1)
    : 1;

  async function onAddGroup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    const result = await addVariableGroup(serviceId, new FormData(e.currentTarget));
    if (!result.ok) return setError(result.error);
    groupForm.current?.reset();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-[var(--radius-md)] bg-[var(--color-surface)] p-4 text-[13px] text-[var(--color-muted)]">
        {groups.length === 0 ? (
          <>No variables. This service has a single price.</>
        ) : (
          <>
            {groups.length} {groups.length === 1 ? 'group' : 'groups'} ·{' '}
            <strong className="text-[var(--color-text)]">{combinationCount}</strong> price
            {combinationCount === 1 ? '' : 's'} to set. Changing variables clears existing prices,
            because the old combinations can no longer be selected.
          </>
        )}
      </div>

      {groups.map((group) => (
        <Card key={group.id}>
          <CardBody>
            <div className="mb-4 flex items-center justify-between gap-4">
              <h3 className="text-[13px] font-bold text-[var(--color-text)]">{group.name}</h3>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete group ${group.name}`}
                disabled={busy}
                onClick={() => startBusy(() => void deleteVariableGroup(serviceId, group.id))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <ul className="mb-4 flex flex-wrap gap-2">
              {group.options.length === 0 && (
                <li className="text-[13px] text-[var(--color-danger)]">
                  No options yet — pricing stays locked until this group has at least one.
                </li>
              )}
              {group.options.map((option) => (
                <li
                  key={option.id}
                  className="flex items-center gap-2 rounded-[var(--radius-pill)] bg-[var(--color-surface)] py-1 pl-3 pr-1 text-[13px]"
                >
                  {option.label}
                  <button
                    type="button"
                    aria-label={`Delete option ${option.label}`}
                    disabled={busy}
                    onClick={() => startBusy(() => void deleteVariableOption(serviceId, option.id))}
                    className="rounded-full p-1 text-[var(--color-muted)] transition-colors duration-[var(--duration-hover)] hover:bg-[var(--color-card)] hover:text-[var(--color-danger)]"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setError(undefined);
                const form = e.currentTarget;
                const result = await addVariableOption(serviceId, group.id, new FormData(form));
                if (!result.ok) return setError(result.error);
                form.reset();
              }}
              className="flex gap-2"
            >
              <Input
                name="label"
                required
                placeholder="1.5 Ton"
                aria-label={`New option for ${group.name}`}
                className="max-w-60"
              />
              <Button type="submit" variant="secondary">
                Add option
              </Button>
            </form>
          </CardBody>
        </Card>
      ))}

      <Card>
        <CardBody>
          <form ref={groupForm} onSubmit={onAddGroup} className="flex items-end gap-2">
            <Input
              name="name"
              required
              placeholder="AC Size"
              aria-label="New variable group name"
              className="max-w-60"
            />
            <Button type="submit">
              <Plus className="h-4 w-4" />
              Add variable group
            </Button>
          </form>
        </CardBody>
      </Card>

      {error && (
        <p role="alert" className="text-[13px] text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  );
}
