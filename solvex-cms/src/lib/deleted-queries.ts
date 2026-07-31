import { desc, isNotNull } from 'drizzle-orm';
import { schema } from '@solvex/db';
import { db } from './cf';

export type DeletedRow = {
  kind: 'category' | 'service' | 'technician' | 'employee';
  id: number | string;
  label: string;
  detail: string | null;
  deletedAt: Date;
  deletedBy: string | null;
};

/**
 * Everything that has been deleted, newest first.
 *
 * Four separate queries rather than a UNION: the tables share no shape beyond
 * the two deleted columns, and a UNION would need every column cast to text,
 * which reads worse than this and gains nothing at these row counts.
 */
export async function listDeleted(): Promise<DeletedRow[]> {
  const d = db();

  const [cats, svcs, techs, staff] = await Promise.all([
    d
      .select({
        id: schema.categories.id,
        label: schema.categories.name,
        deletedAt: schema.categories.deletedAt,
        deletedBy: schema.categories.deletedBy,
      })
      .from(schema.categories)
      .where(isNotNull(schema.categories.deletedAt))
      .orderBy(desc(schema.categories.deletedAt)),

    d
      .select({
        id: schema.services.id,
        label: schema.services.name,
        deletedAt: schema.services.deletedAt,
        deletedBy: schema.services.deletedBy,
      })
      .from(schema.services)
      .where(isNotNull(schema.services.deletedAt))
      .orderBy(desc(schema.services.deletedAt)),

    d
      .select({
        id: schema.technicians.id,
        label: schema.technicians.fullName,
        phone: schema.technicians.phone,
        deletedAt: schema.technicians.deletedAt,
        deletedBy: schema.technicians.deletedBy,
      })
      .from(schema.technicians)
      .where(isNotNull(schema.technicians.deletedAt))
      .orderBy(desc(schema.technicians.deletedAt)),

    d
      .select({
        id: schema.adminUser.id,
        label: schema.adminUser.name,
        email: schema.adminUser.email,
        deletedAt: schema.adminUser.deletedAt,
        deletedBy: schema.adminUser.deletedBy,
      })
      .from(schema.adminUser)
      .where(isNotNull(schema.adminUser.deletedAt))
      .orderBy(desc(schema.adminUser.deletedAt)),
  ]);

  const rows: DeletedRow[] = [
    ...cats.map((r) => ({ kind: 'category' as const, ...r, detail: null })),
    ...svcs.map((r) => ({ kind: 'service' as const, ...r, detail: null })),
    ...techs.map((r) => ({ kind: 'technician' as const, ...r, detail: r.phone })),
    ...staff.map((r) => ({ kind: 'employee' as const, ...r, detail: r.email })),
  ].map((r) => ({ ...r, deletedAt: r.deletedAt! }));

  return rows.sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime());
}

/** Names for the `deleted_by` ids, so the page shows a person, not a token. */
export async function deleterNames(): Promise<Map<string, string>> {
  const rows = await db()
    .select({ id: schema.adminUser.id, name: schema.adminUser.name })
    .from(schema.adminUser);
  return new Map(rows.map((r) => [r.id, r.name]));
}
