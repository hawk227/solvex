import { AUDIT_OUTCOMES, listAuditActions, listAuditLog, type AuditOutcome } from '@solvex/db';
import { auditDb } from '@/lib/cf';
import { requireOwner } from '@/lib/session';
import { Topbar, PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableWrap, Th, Td, Tr, EmptyRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format';

export const metadata = { title: 'Activity log — SolveX Admin' };

const OUTCOME_TONE: Record<AuditOutcome, 'success' | 'warning' | 'danger'> = {
  OK: 'success',
  DENIED: 'warning',
  ERROR: 'danger',
};

const ACTOR_LABEL: Record<string, string> = {
  EMPLOYEE: 'Staff',
  CUSTOMER: 'Customer',
  ANON: 'Signed out',
  SYSTEM: 'System',
};

export default async function AuditPage({ searchParams }: PageProps<'/admin/audit'>) {
  // Owners only. Staff must not be able to check what the log recorded of them.
  await requireOwner();

  const params = await searchParams;
  const one = (key: string) => {
    const value = params[key];
    return (Array.isArray(value) ? value[0] : value)?.trim() || undefined;
  };

  const outcome = AUDIT_OUTCOMES.find((o) => o === one('outcome'));
  const app = ['CMS', 'WEB'].find((a) => a === one('app')) as 'CMS' | 'WEB' | undefined;
  const action = one('action');
  const search = one('q');
  const before = Number(one('before')) || undefined;

  const entries = await listAuditLog(auditDb(), {
    outcome,
    app,
    action,
    search,
    before,
    limit: 100,
  });
  const actions = await listAuditActions(auditDb());

  const chip = (active: boolean) =>
    `inline-flex h-8 items-center gap-2 rounded-[var(--radius-pill)] px-3 text-[13px] ${
      active
        ? 'bg-[var(--color-text)] text-white'
        : 'bg-[var(--color-surface)] text-[var(--color-muted)]'
    }`;

  const query = (overrides: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = { outcome, app, action, q: search, ...overrides };
    for (const [key, value] of Object.entries(merged)) if (value) next.set(key, String(value));
    const qs = next.toString();
    return `/admin/audit${qs ? `?${qs}` : ''}`;
  };

  const oldest = entries.at(-1)?.id;

  return (
    <>
      <Topbar breadcrumb={['Admin', 'Activity log']} />
      <main className="flex-1 p-6">
        <PageHeader
          title="Activity log"
          subtitle="Every action taken in the back-office and by customers. Owners only."
        />

        <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
          {outcome && <input type="hidden" name="outcome" value={outcome} />}
          {app && <input type="hidden" name="app" value={app} />}
          <input
            type="search"
            name="q"
            defaultValue={search ?? ''}
            placeholder="Search by person or what was changed"
            aria-label="Search the activity log"
            className="h-[var(--cms-input-height)] min-w-64 flex-1 rounded-[var(--cms-control-radius)] border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 text-[13px]"
          />
          <select
            name="action"
            defaultValue={action ?? ''}
            aria-label="Filter by action"
            className="h-[var(--cms-input-height)] rounded-[var(--cms-control-radius)] border border-[var(--color-border)] bg-[var(--color-input-bg)] px-2 text-[13px]"
          >
            <option value="">All actions</option>
            {actions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="inline-flex h-[var(--cms-control-height)] items-center rounded-[var(--cms-control-radius)] bg-[var(--color-primary)] px-4 text-[13px] font-medium text-[var(--color-primary-foreground)]"
          >
            Filter
          </button>
        </form>

        <div className="mb-5 flex flex-wrap items-center gap-2">
          <a href={query({ outcome: undefined, before: undefined })} className={chip(!outcome)}>
            All outcomes
          </a>
          {AUDIT_OUTCOMES.map((value) => (
            <a
              key={value}
              href={query({ outcome: value, before: undefined })}
              className={chip(outcome === value)}
            >
              {value === 'OK' ? 'Succeeded' : value === 'DENIED' ? 'Refused' : 'Failed'}
            </a>
          ))}
          <span className="mx-1 h-5 w-px bg-[var(--color-border)]" />
          <a href={query({ app: undefined, before: undefined })} className={chip(!app)}>
            Both apps
          </a>
          <a href={query({ app: 'CMS', before: undefined })} className={chip(app === 'CMS')}>
            Back-office
          </a>
          <a href={query({ app: 'WEB', before: undefined })} className={chip(app === 'WEB')}>
            Website
          </a>
        </div>

        <Card>
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>When</Th>
                  <Th>Who</Th>
                  <Th>Action</Th>
                  <Th>On</Th>
                  <Th>Outcome</Th>
                  <Th>Details</Th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <EmptyRow colSpan={6}>Nothing recorded here yet.</EmptyRow>
                ) : (
                  entries.map((entry) => (
                    <Tr key={entry.id}>
                      <Td>
                        <span className="whitespace-nowrap">{formatDateTime(entry.at)}</span>
                      </Td>
                      <Td>
                        <span className="font-medium">
                          {entry.actorName ?? entry.actorEmail ?? '—'}
                        </span>
                        <span className="block text-xs text-[var(--color-muted)]">
                          {ACTOR_LABEL[entry.actorType] ?? entry.actorType}
                          {entry.ip ? ` · ${entry.ip}` : ''}
                        </span>
                      </Td>
                      <Td>
                        <code className="text-xs">{entry.action}</code>
                      </Td>
                      <Td>
                        {entry.targetLabel ?? entry.targetType ?? '—'}
                        {entry.targetId && (
                          <span className="block text-xs text-[var(--color-muted)]">
                            {entry.targetType} #{entry.targetId}
                          </span>
                        )}
                      </Td>
                      <Td>
                        <Badge tone={OUTCOME_TONE[entry.outcome]}>
                          {entry.outcome === 'OK'
                            ? 'Done'
                            : entry.outcome === 'DENIED'
                              ? 'Refused'
                              : 'Failed'}
                        </Badge>
                        {entry.reason && (
                          <span className="block text-xs text-[var(--color-muted)]">
                            {entry.reason}
                          </span>
                        )}
                      </Td>
                      <Td>
                        {entry.detail ? (
                          <code className="block max-w-80 truncate text-xs text-[var(--color-muted)]">
                            {entry.detail}
                          </code>
                        ) : (
                          '—'
                        )}
                      </Td>
                    </Tr>
                  ))
                )}
              </tbody>
            </Table>
          </TableWrap>
        </Card>

        {entries.length === 100 && oldest && (
          <div className="mt-4">
            <a
              href={query({ before: String(oldest) })}
              className="text-[13px] text-[var(--color-primary)] hover:underline"
            >
              Older entries →
            </a>
          </div>
        )}
      </main>
    </>
  );
}
