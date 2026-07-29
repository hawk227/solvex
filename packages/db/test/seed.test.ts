import { env } from 'cloudflare:test';
import { inArray } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { getDb, schema } from '../src/index';
import { getSlotCapacity } from '../src/booking';
import seedSql from '../src/seed.sql?raw';

/**
 * Strip comment lines, then split on ";" at end of line — the seed file has no
 * procedural SQL. Comments must be removed BEFORE splitting: a leading comment
 * otherwise rides along with the first statement.
 */
function statements(sql: string): string[] {
  return sql
    .replace(/^\s*--.*$/gm, '')
    .split(/;\s*$/m)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

describe('seed', () => {
  it('is idempotent and establishes usable defaults', async () => {
    const db = getDb(env.DB);

    for (const _run of [1, 2]) {
      for (const stmt of statements(seedSql)) {
        await env.DB.prepare(stmt).run();
      }
    }

    // Count only the rows the seed owns, so the assertion holds no matter what
    // other test files have inserted.
    const seededLabels = ['9:00 AM - 12:00 PM', '12:00 PM - 3:00 PM', '3:00 PM - 6:00 PM'];
    const slots = await db
      .select()
      .from(schema.slotTemplates)
      .where(inArray(schema.slotTemplates.label, seededLabels));
    expect(slots).toHaveLength(3);

    const areas = await db
      .select()
      .from(schema.areas)
      .where(inArray(schema.areas.name, ['Dhanmondi', 'Gulshan', 'Banani', 'Uttara']));
    expect(areas).toHaveLength(4);

    const capacity = await getSlotCapacity(db, '2026-12-01', slots[0]!.id);
    expect(capacity).toBe(6);
  });
});
