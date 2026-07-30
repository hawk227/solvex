import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const FIELD =
  'w-full rounded-[var(--web-control-radius)] border border-[var(--color-border)] bg-[var(--color-input-bg)] ' +
  'px-4 text-[var(--web-font-size-body)] text-[var(--color-text)] ' +
  'placeholder:text-[var(--color-muted)] transition-colors duration-[var(--duration-hover)] ' +
  'disabled:opacity-50 disabled:pointer-events-none';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(FIELD, 'h-[var(--web-input-height)]', className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(FIELD, 'min-h-30 py-3', className)} {...props} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(FIELD, 'h-[var(--web-input-height)]', className)} {...props} />;
}

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
      <label htmlFor={htmlFor} className="font-medium text-[var(--color-text)]">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p className="text-[var(--web-font-size-small)] text-[var(--color-muted)]">{hint}</p>
      )}
      {error && (
        <p role="alert" className="text-[var(--web-font-size-small)] text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  );
}

/** Centred card used by every auth screen. */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 items-center justify-center bg-[var(--color-surface)] px-4 py-16">
      <div className="w-full max-w-md">
        <div className="rounded-[var(--web-card-radius)] border border-[var(--color-border)] bg-[var(--color-card)] p-6 md:p-8">
          <h1 className="text-2xl font-semibold text-[var(--color-text)]">{title}</h1>
          {subtitle && (
            <p className="mt-2 text-[var(--web-font-size-small)] text-[var(--color-muted)]">
              {subtitle}
            </p>
          )}
          <div className="mt-6">{children}</div>
        </div>
        {footer && (
          <p className="mt-4 text-center text-[var(--web-font-size-small)] text-[var(--color-muted)]">
            {footer}
          </p>
        )}
      </div>
    </main>
  );
}
