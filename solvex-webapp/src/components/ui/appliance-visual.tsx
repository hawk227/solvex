import {
  AirVent,
  CookingPot,
  Droplet,
  Fan,
  Flame,
  Microwave,
  Refrigerator,
  Tv,
  WashingMachine,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * The stand-in where a service photo would go.
 *
 * There is no photography yet, and stock images of foreign technicians in a
 * Dhaka home would undercut the trust the copy works to build. So this stops
 * pretending a picture is missing: an oversized appliance glyph, cropped by the
 * frame and set on a tinted field, reads as a deliberate illustration rather
 * than a broken asset.
 *
 * The tint is chosen from the category slug, so a category looks the same
 * everywhere it appears and the grid has rhythm instead of ten identical
 * orange squares. Real photographs replace this the moment they are uploaded —
 * nothing here needs undoing first.
 */

const ICONS: Record<string, typeof Wrench> = {
  'air-conditioner': AirVent,
  ac: AirVent,
  refrigerator: Refrigerator,
  fridge: Refrigerator,
  oven: Microwave,
  microwave: Microwave,
  'washing-machine': WashingMachine,
  washer: WashingMachine,
  television: Tv,
  tv: Tv,
  'water-purifier': Droplet,
  geyser: Flame,
  'water-heater': Flame,
  'air-cooler': Fan,
  'kitchen-hood': CookingPot,
  dishwasher: CookingPot,
};

/**
 * Muted fields that sit under the orange accent without competing with it.
 * Deliberately desaturated: this is a backdrop, not the subject.
 */
const TINTS = [
  { field: 'bg-[#fff1e8]', glyph: 'text-[#ff6300]/25' },
  { field: 'bg-[#eef2ff]', glyph: 'text-[#4f5bd5]/22' },
  { field: 'bg-[#ecfdf5]', glyph: 'text-[#0f766e]/22' },
  { field: 'bg-[#fef9c3]', glyph: 'text-[#a16207]/22' },
  { field: 'bg-[#fdf2f8]', glyph: 'text-[#be185d]/20' },
  { field: 'bg-[#f1f5f9]', glyph: 'text-[#334155]/22' },
] as const;

/** Stable per slug, so a category keeps the same tint across every page. */
function tintFor(slug: string) {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  return TINTS[hash % TINTS.length]!;
}

export function ApplianceVisual({
  slug,
  className,
}: {
  /** Category slug preferred; a service slug falls back to the generic glyph. */
  slug: string;
  className?: string;
}) {
  const Icon = ICONS[slug] ?? Wrench;
  const tint = tintFor(slug);

  return (
    <div
      aria-hidden
      className={cn('relative isolate overflow-hidden', tint.field, className)}
    >
      {/*
        Oversized and pushed past the corner on purpose. A glyph centred at icon
        size is what a missing-image placeholder looks like; one cropped by the
        frame looks composed.
      */}
      <Icon
        className={cn(
          'absolute -bottom-[15%] -right-[8%] h-[115%] w-auto',
          'transition-transform duration-[var(--duration-default)] group-hover:scale-105',
          tint.glyph,
        )}
        strokeWidth={1}
      />
    </div>
  );
}
