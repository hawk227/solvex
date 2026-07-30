import { describe, expect, it } from 'vitest';
import { isUniqueViolation } from '../src/errors';

/** Mirrors how Drizzle + D1 actually nest the failure (observed, not guessed). */
function wrapped() {
  const inner = new Error(
    'UNIQUE constraint failed: categories.slug: SQLITE_CONSTRAINT (extended: SQLITE_CONSTRAINT_UNIQUE)',
  );
  const d1 = new Error('D1_ERROR: UNIQUE constraint failed: categories.slug', { cause: inner });
  return new Error('Failed query: insert into "categories" ...', { cause: d1 });
}

describe('isUniqueViolation', () => {
  it('sees through the wrapper chain', () => {
    expect(isUniqueViolation(wrapped())).toBe(true);
  });

  it('is not fooled by the outer message alone', () => {
    // The outer message is what String(err) returns — it has no "UNIQUE" in it.
    expect(String(wrapped()).includes('UNIQUE')).toBe(false);
  });

  it('can narrow to a specific column', () => {
    expect(isUniqueViolation(wrapped(), 'categories.slug')).toBe(true);
    expect(isUniqueViolation(wrapped(), 'services.slug')).toBe(false);
  });

  it('ignores unrelated errors', () => {
    expect(isUniqueViolation(new Error('no such table: widgets'))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation('boom')).toBe(false);
  });

  it('survives a cyclic cause chain', () => {
    const a = new Error('a');
    (a as { cause?: unknown }).cause = a;
    expect(isUniqueViolation(a)).toBe(false);
  });
});
