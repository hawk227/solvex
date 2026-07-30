#!/usr/bin/env node
/**
 * Migration drift check for both databases.
 *
 * Production sat three migrations behind without a symptom: the app ran fine
 * locally, typechecked, built, and would have deployed — the tables were simply
 * absent in production. Nothing surfaced it, so this makes drift something you
 * can look at rather than something you remember to check.
 */
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';

const DATABASES = [
  { name: 'solvex-db', dir: 'migrations' },
  { name: 'solvex-audit', dir: 'migrations-audit' },
];

function appliedRemotely(database) {
  const out = execFileSync(
    'npx',
    [
      'wrangler',
      'd1',
      'execute',
      database,
      '--remote',
      '--json',
      '--command',
      'SELECT name FROM d1_migrations ORDER BY id',
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
  );
  return JSON.parse(out)[0].results.map((row) => row.name);
}

let drifted = false;

for (const { name, dir } of DATABASES) {
  const local = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let remote;
  try {
    remote = appliedRemotely(name);
  } catch {
    console.log(`${name}: could not read remote (not created, or not logged in)`);
    drifted = true;
    continue;
  }

  const pending = local.filter((f) => !remote.includes(f));
  if (pending.length === 0) {
    console.log(`${name}: up to date (${local.length} migrations)`);
  } else {
    drifted = true;
    console.log(`${name}: ${pending.length} PENDING on remote`);
    for (const file of pending) console.log(`    - ${file}`);
  }
}

// Non-zero so CI can fail on drift rather than printing into the void.
process.exit(drifted ? 1 : 0);
