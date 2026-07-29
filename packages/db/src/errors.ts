/**
 * Drizzle wraps D1 failures, so the SQLite message lives on the `cause` chain,
 * not on the outer error. Checking `String(err)` alone silently misses every
 * constraint violation and turns a friendly message into a 500.
 */
function messages(err: unknown, depth = 0): string[] {
  if (depth > 8 || err === null || err === undefined) return [];
  const out: string[] = [];
  if (err instanceof Error) {
    out.push(err.message);
    if ('cause' in err) out.push(...messages(err.cause, depth + 1));
  } else {
    out.push(String(err));
  }
  return out;
}

/** True when the error is a UNIQUE constraint violation, at any nesting depth. */
export function isUniqueViolation(err: unknown, column?: string): boolean {
  const all = messages(err).join(' | ');
  if (!/UNIQUE constraint failed/i.test(all)) return false;
  return column ? all.includes(column) : true;
}
