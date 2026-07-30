import Link from 'next/link';
import { cn } from '@/lib/cn';

/**
 * The SolveX lockup. The wordmark is part of the artwork, so no text is rendered
 * beside it — the accessible name comes from the alt text instead.
 *
 * Intrinsic size is 397x166 (ratio 2.39:1). Width and height are always set
 * together so the header does not reflow while the SVG loads.
 */
export function Logo({
  variant = 'dark',
  height = 32,
  className,
}: {
  /** 'dark' is the black wordmark for light backgrounds; 'light' is for dark ones. */
  variant?: 'dark' | 'light';
  height?: number;
  className?: string;
}) {
  const width = Math.round(height * (397 / 166));
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={variant === 'light' ? '/logo-white.svg' : '/logo.svg'}
      alt="SolveX"
      width={width}
      height={height}
      className={cn('block', className)}
    />
  );
}

/** Logo that links home, for headers. */
export function LogoLink({ className }: { className?: string }) {
  return (
    <Link href="/" aria-label="SolveX home" className={cn('inline-flex shrink-0', className)}>
      <Logo height={34} />
    </Link>
  );
}
