'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

/**
 * Cookie notice.
 *
 * Worth stating plainly, because it shapes the copy: this site currently sets
 * ONE cookie — the sign-in session — and runs no analytics or advertising
 * scripts at all. A strictly necessary cookie needs no consent under GDPR or
 * the regimes modelled on it, so nothing here is a legal requirement today.
 *
 * What it does buy is the mechanism. `hasAnalyticsConsent()` is the gate any
 * future analytics or pixel must pass through, so consent exists before the
 * tracker does rather than being retrofitted after it has already run once.
 *
 * The copy says what is actually true rather than the usual "we value your
 * privacy" while loading forty trackers. If analytics are added later, revise
 * this text in the same change — a notice that describes the old behaviour is
 * worse than none.
 */

const STORAGE_KEY = 'solvex-cookie-choice';

type Choice = 'accepted' | 'declined';

/** Whether optional analytics may run. Defaults to NO until explicitly allowed. */
export function hasAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(STORAGE_KEY) === 'accepted';
}

/** localStorage is an external store, so React reads it through a subscription. */
function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

function readChoice(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Private browsing can throw. Treating that as "already answered" keeps us
    // quiet — nagging on every page load is worse than not asking.
    return 'declined';
  }
}

const EVENT = 'solvex-cookie-choice-change';

export function CookieNotice() {
  /*
   * useSyncExternalStore rather than an effect that calls setState. The server
   * snapshot reports a choice already made, so nothing renders during SSR and
   * the banner cannot flash at someone who answered months ago — and there is
   * no cascading render on mount.
   */
  const choice = useSyncExternalStore(subscribe, readChoice, () => 'declined');

  function choose(next: Choice) {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Nothing to persist to; the dispatch below still closes it for now.
    }
    window.dispatchEvent(new Event(EVENT));
  }

  if (choice !== null) return null;

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-md)]"
    >
      <div className="mx-auto flex max-w-[var(--web-container)] flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
        <p className="text-[var(--web-font-size-small)] text-[var(--color-muted)]">
          We use one cookie to keep you signed in. We do not track you or run advertising
          scripts.{' '}
          <Link
            href="/privacy"
            className="text-[var(--color-primary)] underline hover:no-underline"
          >
            Privacy policy
          </Link>
        </p>

        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" onClick={() => choose('declined')}>
            Decline
          </Button>
          <Button onClick={() => choose('accepted')}>Got it</Button>
        </div>
      </div>
    </div>
  );
}
