'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { PermissionGridFields } from '../permission-grid';
import { resetEmployeePassword, toggleEmployeeActive, updateEmployeeAccess } from '../actions';

export function EmployeeAccessForm({
  subjectId,
  initialGrid,
  isOwner: initialIsOwner,
  active,
  mustChangePassword,
}: {
  subjectId: string;
  initialGrid: Record<string, string>;
  isOwner: boolean;
  active: boolean;
  mustChangePassword: boolean;
}) {
  const router = useRouter();
  const [grid, setGrid] = useState(initialGrid);
  const [isOwner, setIsOwner] = useState(initialIsOwner);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [pending, setPending] = useState(false);

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>, done: string) {
    setPending(true);
    setError(undefined);
    setNotice(undefined);
    const result = await fn();
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? 'That did not work.');
      return;
    }
    setNotice(done);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardBody>
          <form
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              void run(() => updateEmployeeAccess(subjectId, data), 'Access updated.');
            }}
            className="flex flex-col gap-5"
          >
            <h2 className="text-base font-bold text-[var(--color-text)]">Access</h2>

            <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] bg-[var(--color-surface)] p-4">
              <input
                type="checkbox"
                name="isOwner"
                checked={isOwner}
                onChange={(e) => setIsOwner(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]"
              />
              <span className="text-[13px]">
                <strong>Owner</strong>
                <span className="mt-0.5 block text-[var(--color-muted)]">
                  Full control of everything, including employees. Owners ignore the grid below.
                </span>
              </span>
            </label>

            <PermissionGridFields value={grid} onChange={setGrid} disabled={isOwner} />

            {error && (
              <p role="alert" className="text-[13px] text-[var(--color-danger)]">
                {error}
              </p>
            )}
            {notice && !error && (
              <p role="status" className="text-[13px] text-[var(--color-success)]">
                {notice}
              </p>
            )}

            <div>
              <Button type="submit" disabled={pending}>
                {pending ? 'Saving…' : 'Save access'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="text-base font-bold text-[var(--color-text)]">Account</h2>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              variant={active ? 'secondary' : 'primary'}
              disabled={pending}
              onClick={() =>
                void run(
                  () => toggleEmployeeActive(subjectId, !active),
                  active ? 'Employee deactivated.' : 'Employee reactivated.',
                )
              }
            >
              {active ? 'Deactivate' : 'Reactivate'}
            </Button>
            <span className="text-[13px] text-[var(--color-muted)]">
              {active
                ? 'Deactivating blocks sign-in immediately and stops all access.'
                : 'This account cannot sign in.'}
            </span>
          </div>

          <form
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              void run(
                () => resetEmployeePassword(subjectId, data),
                'Temporary password set. They must change it on next sign-in.',
              );
            }}
            className="mt-6 border-t border-[var(--color-border)] pt-5"
          >
            <Field
              label="Set a temporary password"
              htmlFor="reset-password"
              hint={
                mustChangePassword
                  ? 'A temporary password is already pending on this account.'
                  : 'They will be forced to change it on next sign-in.'
              }
            >
              <div className="flex max-w-md gap-2">
                <Input id="reset-password" name="password" minLength={12} className="font-mono" />
                <Button type="submit" variant="secondary" disabled={pending}>
                  Reset
                </Button>
              </div>
            </Field>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
