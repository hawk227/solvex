export function Topbar({ breadcrumb }: { breadcrumb: string[] }) {
  return (
    <header className="flex h-[var(--cms-topbar-height)] shrink-0 items-center justify-between border-b border-[var(--color-border)] px-6">
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-[13px]">
          {breadcrumb.map((crumb, i) => (
            <li key={crumb} className="flex items-center gap-2">
              {i > 0 && (
                <span aria-hidden className="text-[var(--color-muted)]">
                  ›
                </span>
              )}
              <span
                className={
                  i === breadcrumb.length - 1
                    ? 'font-medium text-[var(--color-text)]'
                    : 'text-[var(--color-muted)]'
                }
              >
                {crumb}
              </span>
            </li>
          ))}
        </ol>
      </nav>
    </header>
  );
}

/** Page title, optional sub-line of stats, and right-aligned actions. */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-[length:var(--cms-font-size-page-title)] font-bold leading-tight text-[var(--color-text)]">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-[13px] text-[var(--color-muted)]">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
