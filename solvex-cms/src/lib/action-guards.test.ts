import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Every exported server action must call a permission guard.
 *
 * This is the check that survives forgetfulness. Adding an action without a
 * guard leaves a POST endpoint any signed-in employee can invoke, and nothing
 * else in the codebase would notice — no type error, no failing page, no visible
 * symptom until someone finds it.
 */
const APP = path.join(import.meta.dirname, '..', 'app');
const GUARDS = ['requireManage', 'requireOwner', 'requireView'];

/**
 * Actions that legitimately cannot use a module guard, each with the reason.
 *
 * An allowlist rather than a looser rule: a new exemption has to be added here
 * deliberately, which is a decision someone reviews, instead of quietly
 * inheriting a weaker check.
 */
const EXEMPT: Record<string, string> = {
  // An employee completing a forced password change holds no module access yet,
  // so no module guard could pass. Guarded by identity instead: it can only ever
  // change the caller's own password, and the current password must be supplied.
  'change-password/actions.ts → changeOwnPassword': 'self-service, identity-guarded',
};

/**
 * Actions that legitimately write no audit entry.
 *
 * Read-only actions only. Anything that changes state belongs in the log, so
 * this list should stay empty of mutations.
 */
const AUDIT_EXEMPT: Record<string, string> = {};

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

/** Files that declare 'use server' — every export in these is a POST endpoint. */
function actionModules(): { file: string; source: string }[] {
  return walk(APP)
    .filter((f) => f.endsWith('.ts'))
    .map((file) => ({ file, source: readFileSync(file, 'utf8') }))
    .filter(({ source }) => /^['"]use server['"]/m.test(source));
}

/** Split a module into its exported async functions. */
function exportedActions(source: string): { name: string; body: string }[] {
  const out: { name: string; body: string }[] = [];
  const re = /export\s+async\s+function\s+([A-Za-z0-9_]+)/g;
  let match: RegExpExecArray | null;
  const starts: { name: string; index: number }[] = [];
  while ((match = re.exec(source)) !== null) {
    starts.push({ name: match[1]!, index: match.index });
  }
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i]!;
    const end = i + 1 < starts.length ? starts[i + 1]!.index : source.length;
    out.push({ name: start.name, body: source.slice(start.index, end) });
  }
  return out;
}

describe('server action authorisation', () => {
  const modules = actionModules();

  it('finds the action modules at all', () => {
    // A refactor that moves or renames these must not silently disable this test.
    expect(modules.length).toBeGreaterThan(5);
  });

  it('guards every exported server action', () => {
    const unguarded: string[] = [];

    for (const { file, source } of modules) {
      for (const action of exportedActions(source)) {
        const key = `${path.relative(APP, file)} → ${action.name}`;
        if (key in EXEMPT) {
          // An exempt action must still establish who is calling.
          expect(action.body).toContain('getCurrentEmployee(');
          continue;
        }
        const guarded = GUARDS.some((g) => action.body.includes(`${g}(`));
        if (!guarded) unguarded.push(`${key}()`);
      }
    }

    expect(unguarded).toEqual([]);
  });

  /**
   * Every action must also leave an audit trail.
   *
   * Same reasoning as the guard check above: an action that writes to the
   * database without recording who did it produces no error and no visible
   * symptom, and the gap is only discovered when someone needs the log and it
   * is not there.
   */
  it('audits every exported server action', () => {
    const silent: string[] = [];

    for (const { file, source } of modules) {
      for (const action of exportedActions(source)) {
        const key = `${path.relative(APP, file)} → ${action.name}`;
        if (key in AUDIT_EXEMPT) continue;
        if (!/\baudit(As)?\(/.test(action.body)) silent.push(`${key}()`);
      }
    }

    expect(silent).toEqual([]);
  });

  it('no action still calls the removed requireAdmin helper', () => {
    const stale = modules
      .filter(({ source }) => source.includes('requireAdmin'))
      .map(({ file }) => path.relative(APP, file));
    expect(stale).toEqual([]);
  });
});
