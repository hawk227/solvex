'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, RefreshCw } from 'lucide-react';
import { PRESETS } from '@solvex/db';
import { Dialog, DialogContent, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { PermissionGridFields } from './permission-grid';
import { createEmployee } from './actions';

/** Unambiguous alphabet: this gets read aloud or typed from a message. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

function generatePassword(length = 16): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

export function NewEmployeeForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [grid, setGrid] = useState<Record<string, string>>({ ...PRESETS.Support! });
  const [password, setPassword] = useState(generatePassword());
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);

    const result = await createEmployee(new FormData(e.currentTarget));

    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    setGrid({ ...PRESETS.Support! });
    setPassword(generatePassword());
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(n) => { setOpen(n); if (!n) setError(undefined); }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Add employee
        </Button>
      </DialogTrigger>

      <DialogContent
        title="Onboard an employee"
        description="They sign in with this temporary password and must change it immediately."
        className="max-w-[640px]"
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Full name" htmlFor="emp-name">
              <Input id="emp-name" name="name" required placeholder="Nusrat Jahan" />
            </Field>
            <Field label="Email" htmlFor="emp-email" hint="Used to sign in.">
              <Input id="emp-email" name="email" type="email" required />
            </Field>
          </div>

          <Field
            label="Temporary password"
            htmlFor="emp-password"
            hint="Give this to them directly. They must change it on first sign-in, and it expires in 7 days if unused."
          >
            <div className="flex gap-2">
              <Input
                id="emp-password"
                name="password"
                required
                minLength={12}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="font-mono"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => setPassword(generatePassword())}
                aria-label="Generate a new password"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </Field>

          <div>
            <p className="mb-3 text-[13px] font-medium">Access</p>
            <PermissionGridFields value={grid} onChange={setGrid} />
          </div>

          {error && (
            <p role="alert" className="text-[13px] text-[var(--color-danger)]">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? 'Creating…' : 'Create employee'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
