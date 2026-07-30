'use client';

import * as Accordion from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';

/**
 * Radix Accordion handles the button/region ARIA pairing and keyboard support.
 */
export function Faqs({ faqs }: { faqs: { q: string; a: string }[] }) {
  return (
    <Accordion.Root type="single" collapsible className="mt-3 divide-y divide-[var(--color-border)]">
      {faqs.map((faq, i) => (
        <Accordion.Item key={`${faq.q}-${i}`} value={`faq-${i}`}>
          <Accordion.Header>
            <Accordion.Trigger className="group flex min-h-[var(--web-control-height)] w-full items-center justify-between gap-4 py-4 text-left font-medium text-[var(--color-text)]">
              {faq.q}
              <ChevronDown
                aria-hidden
                className="h-4 w-4 shrink-0 text-[var(--color-muted)] transition-transform duration-[var(--duration-default)] group-data-[state=open]:rotate-180"
              />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="pb-4 text-[var(--color-muted)]">{faq.a}</Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
