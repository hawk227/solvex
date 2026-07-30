'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ReferralCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}/signup?ref=${encodeURIComponent(code)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked by permissions; the code stays visible to copy
      // by hand, so there is nothing to recover from.
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <code className="rounded-[var(--radius-md)] bg-[var(--color-surface)] px-4 py-3 text-lg font-bold tracking-widest text-[var(--color-text)]">
        {code}
      </code>
      <Button variant="outline" onClick={copy}>
        {copied ? (
          <>
            <Check aria-hidden className="h-4 w-4" />
            Link copied
          </>
        ) : (
          <>
            <Copy aria-hidden className="h-4 w-4" />
            Copy invite link
          </>
        )}
      </Button>
      <p aria-live="polite" className="sr-only">
        {copied ? 'Invite link copied to clipboard' : ''}
      </p>
    </div>
  );
}
