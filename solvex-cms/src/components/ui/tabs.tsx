'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/cn';

/**
 * Radix supplies roving-focus arrow-key navigation and the tab/panel ARIA
 * relationship; the styling is ours.
 */
export function Tabs({
  tabs,
  className,
}: {
  tabs: { value: string; label: string; content: React.ReactNode }[];
  className?: string;
}) {
  const first = tabs[0]?.value;
  if (!first) return null;

  return (
    <TabsPrimitive.Root defaultValue={first} className={className}>
      <TabsPrimitive.List className="mb-5 flex gap-1 border-b border-[var(--color-border)]">
        {tabs.map((tab) => (
          <TabsPrimitive.Trigger
            key={tab.value}
            value={tab.value}
            className={cn(
              '-mb-px border-b-2 px-4 py-2.5 text-[13px] font-medium',
              'transition-colors duration-[var(--duration-hover)]',
              'border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]',
              'data-[state=active]:border-[var(--color-primary)] data-[state=active]:text-[var(--color-primary)]',
            )}
          >
            {tab.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>

      {tabs.map((tab) => (
        <TabsPrimitive.Content key={tab.value} value={tab.value}>
          {tab.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}
