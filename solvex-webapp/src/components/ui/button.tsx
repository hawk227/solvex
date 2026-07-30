import { Slot } from '@radix-ui/react-slot';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost';
type Size = 'md' | 'lg' | 'icon';

/*
 * Public-site controls are 44px minimum (52px for the large call to action),
 * per the design system's touch-target rule. Customers book on phones.
 */
const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)]',
  secondary: 'bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-border)]',
  outline:
    'border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-tint)]/20',
  ghost: 'text-[var(--color-text)] hover:bg-[var(--color-surface)]',
};

const SIZES: Record<Size, string> = {
  md: 'h-[var(--web-control-height)] px-5 gap-2 text-[var(--web-font-size-small)]',
  lg: 'h-[var(--web-control-height-lg)] px-6 gap-2 text-[var(--web-font-size-body)]',
  icon: 'h-[var(--web-control-height)] w-[var(--web-control-height)] justify-center',
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
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
      type={asChild ? undefined : (type ?? 'button')}
      className={cn(
        'inline-flex items-center justify-center rounded-[var(--web-control-radius)] font-medium',
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
