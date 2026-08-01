import { cn } from '@/lib/cn';

/**
 * Section artwork, in a technical-drawing register.
 *
 * Photography is not shot yet, and stock images of foreign technicians in a
 * Dhaka flat would undercut exactly the trust this site's copy works to build.
 * So the artwork is drawn rather than borrowed, and it commits to a look with a
 * reason behind it: measured lines, a faint grid, callout marks — the visual
 * language of diagnosis and repair, which is what the business actually sells.
 *
 * Inline SVG rather than image files. It costs no extra request, scales to any
 * width without a srcset, recolours from the same CSS variables as the rest of
 * the page, and there is no broken-image state if a CDN goes down.
 *
 * When real photographs exist, these become the fallback rather than the
 * default — no layout depends on them.
 */

/** The graph-paper field every variant sits on. */
function Grid({ id }: { id: string }) {
  return (
    <defs>
      <pattern id={id} width="16" height="16" patternUnits="userSpaceOnUse">
        <path
          d="M16 0H0V16"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          opacity="0.18"
        />
      </pattern>
    </defs>
  );
}

/**
 * A split-unit air conditioner, drawn as a service diagram: the unit, the
 * airflow, and a dimension line — the things a technician would actually mark.
 */
export function BlueprintAc({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 280"
      role="img"
      aria-label="Technical drawing of a wall-mounted air conditioner"
      className={cn('h-full w-full', className)}
    >
      <Grid id="bp-ac-grid" />
      <rect width="400" height="280" fill="url(#bp-ac-grid)" className="text-[var(--color-muted)]" />

      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-[var(--color-primary)]"
      >
        {/* Indoor unit */}
        <rect x="90" y="60" width="220" height="66" rx="12" strokeWidth="2.5" />
        <path d="M104 104h192" strokeWidth="1.5" opacity="0.5" />
        <circle cx="286" cy="78" r="3.5" strokeWidth="1.5" />

        {/* Airflow, the part a cleaning service is judged on */}
        <path d="M130 146c0 22 8 30 8 46" strokeWidth="2" opacity="0.75" />
        <path d="M200 146c0 26 -8 34 -8 52" strokeWidth="2" opacity="0.75" />
        <path d="M270 146c0 22 8 30 8 46" strokeWidth="2" opacity="0.75" />
        <path d="M133 196l5 8 5-8M189 202l3 9 5-8M281 196l5 8 5-8" strokeWidth="2" opacity="0.75" />
      </g>

      {/* Dimension line: the detail that makes it read as a measured drawing */}
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        className="text-[var(--color-muted)]"
        opacity="0.55"
      >
        <path d="M90 44h220M90 38v12M310 38v12" />
      </g>
    </svg>
  );
}

/** A refrigerator, sectioned the way a fault diagram would show it. */
export function BlueprintFridge({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 280"
      role="img"
      aria-label="Technical drawing of a refrigerator"
      className={cn('h-full w-full', className)}
    >
      <Grid id="bp-fridge-grid" />
      <rect
        width="400"
        height="280"
        fill="url(#bp-fridge-grid)"
        className="text-[var(--color-muted)]"
      />

      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-[var(--color-primary)]"
      >
        <rect x="140" y="34" width="120" height="212" rx="14" strokeWidth="2.5" />
        <path d="M140 118h120" strokeWidth="2" />
        <path d="M243 74v26M243 140v26" strokeWidth="2.5" opacity="0.8" />
        {/* Coil at the back — the part that fails when nobody cleans it */}
        <path
          d="M272 150h26v12h-26v12h26v12h-26v12h26"
          strokeWidth="1.5"
          opacity="0.6"
        />
      </g>

      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        className="text-[var(--color-muted)]"
        opacity="0.55"
      >
        <path d="M118 34v212M112 34h12M112 246h12" />
      </g>
    </svg>
  );
}

/** A washing machine, drum on the diagonal like a parts diagram. */
export function BlueprintWasher({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 280"
      role="img"
      aria-label="Technical drawing of a washing machine"
      className={cn('h-full w-full', className)}
    >
      <Grid id="bp-washer-grid" />
      <rect
        width="400"
        height="280"
        fill="url(#bp-washer-grid)"
        className="text-[var(--color-muted)]"
      />

      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-[var(--color-primary)]"
      >
        <rect x="128" y="44" width="144" height="192" rx="14" strokeWidth="2.5" />
        <circle cx="200" cy="152" r="46" strokeWidth="2.5" />
        <circle cx="200" cy="152" r="30" strokeWidth="1.5" opacity="0.55" />
        <path d="M146 74h56" strokeWidth="2" opacity="0.6" />
        <circle cx="248" cy="76" r="6" strokeWidth="1.75" opacity="0.8" />
      </g>

      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        className="text-[var(--color-muted)]"
        opacity="0.5"
      >
        <path d="M200 152l72 -58M272 94l-14 2M272 94l2 14" />
      </g>
    </svg>
  );
}
