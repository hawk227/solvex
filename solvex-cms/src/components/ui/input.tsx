import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/lib/cn';

const FIELD_BASE =
  'w-full rounded-[var(--cms-control-radius)] bg-[var(--color-input-bg)] ' +
  'border border-[var(--color-border)] px-3 text-[13px] text-[var(--color-text)] ' +
  'placeholder:text-[var(--color-muted)] ' +
  'transition-colors duration-[var(--duration-hover)] ' +
  'disabled:opacity-50 disabled:pointer-events-none';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input className={cn(FIELD_BASE, 'h-[var(--cms-input-height)]', className)} {...props} />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(FIELD_BASE, 'min-h-30 py-2', className)} {...props} />;
}

export function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn('block text-[13px] font-medium text-[var(--color-text)]', className)}
      {...props}
    />
  );
}

/** Label + field + optional error, at the 8px label gap from the design system. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string | undefined;
  hint?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-[var(--color-muted)]">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  );
}
