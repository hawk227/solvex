import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { getDb, schema } from '../src/index';
import {
  REDACTED,
  countAuditEntries,
  getAuditDb,
  listAuditLog,
  recordAudit,
  redact,
} from '../src/audit';

const auditDb = () => getAuditDb(env.AUDIT_DB);

describe('redact', () => {
  it('strips every secret-bearing field name', () => {
    const out = redact({
      email: 'rafiq@example.com',
      password: 'hunter2',
      newPassword: 'hunter3',
      currentPassword: 'hunter1',
      tempPassword: 'Ab3!xY9z',
      otp: '482913',
      code: '482913',
      token: 'sess_abc',
      secret: 'shhh',
    }) as Record<string, unknown>;

    expect(out.email).toBe('rafiq@example.com');
    for (const key of [
      'password',
      'newPassword',
      'currentPassword',
      'tempPassword',
      'otp',
      'code',
      'token',
      'secret',
    ]) {
      expect(out[key]).toBe(REDACTED);
    }

    // The real requirement: no secret survives anywhere in the output.
    const serialised = JSON.stringify(out);
    for (const secret of ['hunter1', 'hunter2', 'hunter3', 'Ab3!xY9z', '482913', 'sess_abc']) {
      expect(serialised).not.toContain(secret);
    }
  });

  it('is case-insensitive and reaches nested values', () => {
    const out = redact({
      form: { PASSWORD: 'hunter2', nested: { Otp: '111222' } },
      list: [{ token: 'abc' }],
    });
    const serialised = JSON.stringify(out);

    expect(serialised).not.toContain('hunter2');
    expect(serialised).not.toContain('111222');
    expect(serialised).not.toContain('abc');
  });

  it('does not mutate the caller’s object', () => {
    const input = { password: 'hunter2' };
    redact(input);
    expect(input.password).toBe('hunter2');
  });

  it('survives a cyclic object rather than hanging', () => {
    const cyclic: Record<string, unknown> = { name: 'x' };
    cyclic.self = cyclic;
    expect(() => JSON.stringify(redact(cyclic))).not.toThrow();
  });
});

describe('recordAudit', () => {
  it('writes to the audit database, not the application one', async () => {
    await recordAudit(auditDb(), {
      app: 'CMS',
      actorType: 'EMPLOYEE',
      actorId: 'admin_1',
      actorName: 'Ashfaque',
      action: 'catalog.category.create',
      module: 'catalog',
      targetType: 'category',
      targetId: 7,
      targetLabel: 'Air Conditioner',
    });

    const [entry] = await listAuditLog(auditDb(), { action: 'catalog.category.create' });
    expect(entry).toMatchObject({
      app: 'CMS',
      actorName: 'Ashfaque',
      targetLabel: 'Air Conditioner',
      targetId: '7',
      outcome: 'OK',
    });

    // The separation is the point: the application database must know nothing
    // about this table. A shared database would make the check below pass by
    // accident, so it asserts the table is genuinely absent there.
    const main = getDb(env.DB);
    await expect(main.all(`SELECT 1 FROM audit_log`)).rejects.toThrow();
  });

  it('redacts secrets on the way in', async () => {
    await recordAudit(auditDb(), {
      app: 'CMS',
      actorType: 'EMPLOYEE',
      actorId: 'admin_1',
      action: 'employees.password.reset',
      detail: { email: 'staff@example.com', tempPassword: 'Ab3!xY9z' },
    });

    const [entry] = await listAuditLog(auditDb(), { action: 'employees.password.reset' });
    expect(entry!.detail).toContain('staff@example.com');
    expect(entry!.detail).not.toContain('Ab3!xY9z');
  });

  it('never throws when the audit database is unusable', async () => {
    // A logging fault must not take down the action that caused it. Passing a
    // broken binding is the closest stand-in for an audit outage.
    const broken = getAuditDb({
      prepare: () => {
        throw new Error('D1_ERROR: database is unavailable');
      },
    } as unknown as D1Database);

    const before = await countAuditEntries(auditDb());
    await expect(
      recordAudit(broken, { app: 'CMS', actorType: 'SYSTEM', action: 'anything' }),
    ).resolves.toBeUndefined();
    // And it genuinely wrote nothing, rather than falling back to the main DB.
    expect(await countAuditEntries(auditDb())).toBe(before);
  });

  it('records denials, which is the reason the log exists', async () => {
    await recordAudit(auditDb(), {
      app: 'CMS',
      actorType: 'EMPLOYEE',
      actorId: 'admin_9',
      actorName: 'Curious Colleague',
      action: 'orders.status.change',
      module: 'orders',
      outcome: 'DENIED',
      reason: 'requires manage access',
    });

    const [entry] = await listAuditLog(auditDb(), { outcome: 'DENIED' });
    expect(entry).toMatchObject({ outcome: 'DENIED', reason: 'requires manage access' });
  });
});

describe('listAuditLog', () => {
  it('returns newest first and pages by id without OFFSET', async () => {
    for (const n of [1, 2, 3]) {
      await recordAudit(auditDb(), {
        app: 'WEB',
        actorType: 'CUSTOMER',
        actorId: 'user_page',
        action: 'paging.probe',
        targetLabel: `entry ${n}`,
      });
    }

    const page1 = await listAuditLog(auditDb(), { action: 'paging.probe', limit: 2 });
    expect(page1).toHaveLength(2);
    expect(page1[0]!.id).toBeGreaterThan(page1[1]!.id);

    const page2 = await listAuditLog(auditDb(), {
      action: 'paging.probe',
      limit: 2,
      before: page1[1]!.id,
    });
    expect(page2[0]!.id).toBeLessThan(page1[1]!.id);
  });

  it('treats a typed % as a literal, not a wildcard', async () => {
    await recordAudit(auditDb(), {
      app: 'CMS',
      actorType: 'EMPLOYEE',
      actorName: 'Nobody Special',
      action: 'search.probe',
    });

    // Would match every row if the wildcard were not escaped.
    expect(await listAuditLog(auditDb(), { search: '%' })).toHaveLength(0);
  });
});
