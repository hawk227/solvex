import { cn } from '@/lib/cn';

/**
 * Attribution badge for the sign-in screen.
 *
 * Sits on the gradient, so it is a frosted-glass pill rather than plain text:
 * a translucent fill plus backdrop blur keeps it legible over both the dark navy
 * and the pale pink ends without hardcoding a colour for either.
 *
 * The sheen animation is gated behind prefers-reduced-motion (design system §15).
 */
export function PoweredBy({ className }: { className?: string }) {
  return (
    <a
      href="https://intellisidea.com"
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'group relative inline-flex items-center gap-2.5 overflow-hidden',
        'rounded-[var(--radius-pill)] border border-white/20 bg-white/10 px-4 py-2',
        'backdrop-blur-md transition-all duration-[var(--duration-default)]',
        'hover:-translate-y-0.5 hover:border-white/35 hover:bg-white/15',
        className,
      )}
    >
      {/* Sheen that sweeps across on hover. Decorative only. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full motion-reduce:hidden motion-reduce:group-hover:translate-x-0"
      />

      {/* Spark mark, echoing the X in the SolveX lockup. */}
      <span
        aria-hidden
        className="relative flex h-5 w-5 items-center justify-center rounded-full bg-white/15"
      >
        <svg viewBox="0 0 24 24" className="h-3 w-3 fill-white/90">
          <path d="M13.5 2 4 14h6l-1.5 8 9.5-12h-6z" />
        </svg>
      </span>

      <span className="relative text-[11px] leading-none">
        <span className="block text-white/60">Powered by</span>
        <span className="mt-0.5 block font-semibold tracking-wide text-white">
          Intellis Idea
        </span>
      </span>
    </a>
  );
}
