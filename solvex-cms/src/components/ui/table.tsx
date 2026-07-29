import { cn } from '@/lib/cn';

/** Tables scroll inside their own container so the page never scrolls sideways. */
export function TableWrap({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('w-full overflow-x-auto', className)} {...props} />;
}

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn('w-full border-collapse text-left', className)} {...props} />;
}

export function Th({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'px-4 py-3 text-[var(--cms-font-size-table-head)] font-medium uppercase tracking-wide',
        'text-[var(--color-muted)] whitespace-nowrap',
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn('px-4 py-3 text-[13px] text-[var(--color-text)] align-middle', className)}
      {...props}
    />
  );
}

export function Tr({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('border-t border-[var(--color-border)]', className)} {...props} />;
}

/** Shown in place of rows when a list is empty. */
export function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr className="border-t border-[var(--color-border)]">
      <td colSpan={colSpan} className="px-4 py-12 text-center text-[13px] text-[var(--color-muted)]">
        {children}
      </td>
    </tr>
  );
}
