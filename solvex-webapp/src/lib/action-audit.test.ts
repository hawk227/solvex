import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Every exported server action must leave an audit trail.
 *
 * The customer-facing app had no repo-wide check of its own. An action that
 * places or cancels a booking without recording who did it produces no error
 * and no visible symptom — the gap only surfaces when someone needs the log
 * and it is not there.
 */
const APP = path.join(import.meta.dirname, '..', 'app');

/**
 * Read-only actions, each with its reason. Anything that changes state belongs
 * in the log, so nothing that mutates should ever be added here.
 */
const EXEMPT: Record<string, string> = {
  '(site)/book/[slug]/availability-action.ts → fetchAvailability':
    'read-only; fires on every date change and would bury real entries',
};

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

function actionModules(): { file: string; source: string }[] {
  return walk(APP)
    .filter((f) => f.endsWith('.ts'))
    .map((file) => ({ file, source: readFileSync(file, 'utf8') }))
    .filter(({ source }) => /^['"]use server['"]/m.test(source));
}

function exportedActions(source: string): { name: string; body: string }[] {
  const starts: { name: string; index: number }[] = [];
  const re = /export\s+async\s+function\s+([A-Za-z0-9_]+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) starts.push({ name: match[1]!, index: match.index });

  return starts.map((start, i) => ({
    name: start.name,
    body: source.slice(start.index, i + 1 < starts.length ? starts[i + 1]!.index : source.length),
  }));
}

describe('customer server actions', () => {
  const modules = actionModules();

  it('finds the action modules at all', () => {
    // A move or rename must not silently disable this test.
    expect(modules.length).toBeGreaterThan(3);
  });

  it('audits every exported server action', () => {
    const silent: string[] = [];

    for (const { file, source } of modules) {
      for (const action of exportedActions(source)) {
        const key = `${path.relative(APP, file)} → ${action.name}`;
        if (key in EXEMPT) continue;
        if (!/\baudit\(/.test(action.body)) silent.push(`${key}()`);
      }
    }

    expect(silent).toEqual([]);
  });

  it('establishes the caller in every action, audited or not', () => {
    const anonymous: string[] = [];

    for (const { file, source } of modules) {
      for (const action of exportedActions(source)) {
        if (!action.body.includes('requireCustomer(')) {
          anonymous.push(`${path.relative(APP, file)} → ${action.name}()`);
        }
      }
    }

    expect(anonymous).toEqual([]);
  });
});
