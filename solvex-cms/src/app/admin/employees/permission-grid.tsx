'use client';

import { PERMISSION_LEVELS, PERMISSION_MODULES, PRESETS } from '@solvex/db';
import { cn } from '@/lib/cn';

const MODULE_LABEL: Record<string, string> = {
  orders: 'Orders',
  catalog: 'Catalog & pricing',
  technicians: 'Technicians',
  customers: 'Customers',
  referrals: 'Referrals',
  analytics: 'Dashboard',
  settings: 'Areas, slots & settings',
};

const LEVEL_LABEL: Record<string, string> = {
  none: 'No access',
  view: 'View only',
  manage: 'Full control',
};

/**
 * Module × level grid. Presets write ordinary values into the same radios, so
 * picking one then adjusting a row behaves exactly as you would expect.
 */
export function PermissionGridFields({
  value,
  onChange,
  disabled,
}: {
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] text-[var(--color-muted)]">Start from:</span>
        {Object.keys(PRESETS)
          .filter((p) => p !== 'Owner')
          .map((preset) => (
            <button
              key={preset}
              type="button"
              disabled={disabled}
              onClick={() => onChange({ ...PRESETS[preset]! })}
              className="rounded-[var(--radius-pill)] border border-[var(--color-border)] px-3 py-1 text-xs transition-colors duration-[var(--duration-hover)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-50"
            >
              {preset}
            </button>
          ))}
      </div>

      <div className={cn('overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]', disabled && 'opacity-50')}>
        {PERMISSION_MODULES.map((module, i) => (
          <div
            key={module}
            className={cn(
              'flex flex-wrap items-center justify-between gap-3 px-4 py-3',
              i > 0 && 'border-t border-[var(--color-border)]',
            )}
          >
            <span className="text-[13px] font-medium">{MODULE_LABEL[module] ?? module}</span>
            <div className="flex gap-1">
              {PERMISSION_LEVELS.map((level) => {
                const active = value[module] === level;
                return (
                  <label
                    key={level}
                    className={cn(
                      'cursor-pointer rounded-[var(--radius-sm)] px-3 py-1.5 text-xs transition-colors duration-[var(--duration-hover)]',
                      active
                        ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                        : 'bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-[var(--color-text)]',
                      disabled && 'pointer-events-none',
                    )}
                  >
                    <input
                      type="radio"
                      name={`perm:${module}`}
                      value={level}
                      checked={active}
                      disabled={disabled}
                      onChange={() => onChange({ ...value, [module]: level })}
                      className="sr-only"
                    />
                    {LEVEL_LABEL[level]}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
