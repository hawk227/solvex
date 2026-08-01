'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { MapPin, Search } from 'lucide-react';

/**
 * Area picker fused to a service search, as on the reference site.
 *
 * Submitting navigates to /services with the query, so results are a real,
 * shareable, indexable URL rather than client-only state.
 */
export function HeroSearch({
  areas,
  strings,
}: {
  areas: { id: number; name: string }[];
  /** Passed from the server: a client component cannot read the locale header. */
  strings: { area: string; allAreas: string; searchPlaceholder: string; search: string };
}) {
  const router = useRouter();
  const [area, setArea] = useState('');
  const [query, setQuery] = useState('');

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (area) params.set('area', area);
    router.push(`/services${params.size ? `?${params}` : ''}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      role="search"
      className="mx-auto flex w-full max-w-3xl flex-col gap-2 sm:flex-row sm:gap-0 sm:rounded-[var(--web-control-radius)] sm:bg-white sm:p-2"
    >
      <div className="relative sm:w-52 sm:shrink-0">
        <MapPin
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-primary)]"
        />
        <label htmlFor="hero-area" className="sr-only">
          {strings.area}
        </label>
        <select
          id="hero-area"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className="h-[var(--web-search-height)] w-full appearance-none rounded-[var(--web-control-radius)] bg-white pl-9 pr-3 text-[var(--web-font-size-small)] text-[var(--color-text)] sm:h-12 sm:bg-transparent"
        >
          <option value="">{strings.allAreas}</option>
          {areas.map((a) => (
            <option key={a.id} value={a.name}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <div aria-hidden className="hidden w-px shrink-0 self-stretch bg-[var(--color-border)] sm:block" />

      <label htmlFor="hero-q" className="sr-only">
        {strings.searchPlaceholder}
      </label>
      <input
        id="hero-q"
        name="q"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={strings.searchPlaceholder}
        // flex-1 is scoped to the row layout: in the mobile column layout it
        // would set flex-basis 0 and collapse the input's height.
        className="h-[var(--web-search-height)] min-w-0 shrink-0 rounded-[var(--web-control-radius)] bg-white px-4 text-[var(--web-font-size-body)] text-[var(--color-text)] placeholder:text-[var(--color-muted)] sm:h-12 sm:shrink sm:flex-1 sm:bg-transparent"
      />

      <button
        type="submit"
        className="flex h-[var(--web-search-height)] items-center justify-center gap-2 rounded-[var(--web-control-radius)] bg-[var(--color-primary)] px-6 font-medium text-[var(--color-primary-foreground)] transition-colors duration-[var(--duration-hover)] hover:bg-[var(--color-primary-hover)] sm:h-12"
      >
        <Search aria-hidden className="h-4 w-4" />
        {strings.search}
      </button>
    </form>
  );
}
