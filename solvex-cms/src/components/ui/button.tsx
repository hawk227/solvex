import { Slot } from '@radix-ui/react-slot';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'sm' | 'icon';

/*
 * Heights and radii come from the CMS density tokens (36px control, 14px
 * radius), measured from the reference back-office. Colors are brand tokens.
 * Nothing here is an arbitrary value.
 */
const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)]',
  secondary:
    'bg-[var(--color-card)] text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-surface)]',
  ghost: 'bg-transparent text-[var(--color-text)] hover:bg-[var(--color-surface)]',
  danger: 'bg-[var(--color-danger)] text-white hover:opacity-90',
};

const SIZES: Record<Size, string> = {
  md: 'h-[var(--cms-control-height)] px-4 gap-2',
  sm: 'h-8 px-3 gap-1.5',
  icon: 'h-[var(--cms-control-height)] w-[var(--cms-control-height)] justify-center',
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  /** Render as the single child element instead of a <button>. */
  asChild?: boolean;
};

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  asChild = false,
  type,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      // Defaulting to "button" prevents a button inside a form from submitting
      // it by accident; submits opt in explicitly.
      type={asChild ? undefined : (type ?? 'button')}
      className={cn(
        'inline-flex items-center rounded-[var(--cms-control-radius)] text-[13px] font-medium',
        'transition-colors duration-[var(--duration-hover)]',
        'disabled:opacity-50 disabled:pointer-events-none',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
