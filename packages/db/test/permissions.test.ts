import { env } from 'cloudflare:test';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { getDb, schema } from '../src/index';
import {
  PERMISSION_MODULES,
  PRESETS,
  TEMP_PASSWORD_TTL_MS,
  can,
  emptyGrid,
  getEmployee,
  isTempPasswordExpired,
  satisfies,
  setEmployeeActive,
  setOwner,
  setPermissions,
  visibleModules,
} from '../src/permissions';

async function employee(
  db: ReturnType<typeof getDb>,
  opts: { owner?: boolean; active?: boolean } = {},
) {
  const id = `emp_${crypto.randomUUID().slice(0, 8)}`;
  await db.insert(schema.adminUser).values({
    id,
    name: 'Employee',
    email: `${id}@example.com`,
    isOwner: opts.owner ?? false,
    active: opts.active ?? true,
  });
  return (await getEmployee(db, id))!;
}

describe('satisfies', () => {
  it('treats manage as covering view', () => {
    expect(satisfies('manage', 'view')).toBe(true);
    expect(satisfies('manage', 'manage')).toBe(true);
  });

  it('does not let view stand in for manage', () => {
    expect(satisfies('view', 'manage')).toBe(false);
  });

  it('grants nothing at none', () => {
    expect(satisfies('none', 'view')).toBe(false);
    expect(satisfies('none', 'manage')).toBe(false);
    // A "none" requirement is met by anything, including none.
    expect(satisfies('none', 'none')).toBe(true);
  });
});

describe('getEmployee', () => {
  it('defaults every module to none when nothing is granted', async () => {
    const db = getDb(env.DB);
    const e = await employee(db);
    expect(e.permissions).toEqual(emptyGrid());
    expect(can(e, 'orders', 'view')).toBe(false);
  });

  it('gives owners everything without any grid rows', async () => {
    const db = getDb(env.DB);
    const owner = await employee(db, { owner: true });

    const rows = await db
      .select()
      .from(schema.adminPermissions)
      .where(eq(schema.adminPermissions.adminUserId, owner.id));
    expect(rows).toHaveLength(0);

    expect(can(owner, 'settings', 'manage')).toBe(true);
    expect(can(owner, 'orders', 'manage')).toBe(true);
    expect(visibleModules(owner)).toHaveLength(PERMISSION_MODULES.length);
  });

  it('grants nothing to a deactivated employee, whatever the grid says', async () => {
    const db = getDb(env.DB);
    const owner = await employee(db, { owner: true });
    const staff = await employee(db);

    await setPermissions(db, owner, staff.id, { ...emptyGrid(), orders: 'manage' });
    await setEmployeeActive(db, owner, staff.id, false);

    const after = (await getEmployee(db, staff.id))!;
    expect(after.permissions.orders).toBe('manage');
    expect(can(after, 'orders', 'view')).toBe(false);
    expect(visibleModules(after)).toEqual([]);
  });

  it('ignores a grant for a module that is no longer recognised', async () => {
    const db = getDb(env.DB);
    const staff = await employee(db);

    await db.insert(schema.adminPermissions).values({
      adminUserId: staff.id,
      // Cast through unknown: the point is a stale row that TypeScript forbids.
      module: 'nonsense' as unknown as 'orders',
      level: 'manage',
    });

    const after = (await getEmployee(db, staff.id))!;
    expect(after.permissions).toEqual(emptyGrid());
  });
});

describe('setPermissions', () => {
  it('replaces the grid and records who did it', async () => {
    const db = getDb(env.DB);
    const owner = await employee(db, { owner: true });
    const staff = await employee(db);

    const result = await setPermissions(db, owner, staff.id, PRESETS.Dispatcher!);
    expect(result).toEqual({ ok: true });

    const after = (await getEmployee(db, staff.id))!;
    expect(after.permissions).toEqual(PRESETS.Dispatcher);
    expect(can(after, 'orders', 'manage')).toBe(true);
    expect(can(after, 'settings', 'view')).toBe(false);

    const audit = await db
      .select()
      .from(schema.adminAudit)
      .where(eq(schema.adminAudit.subjectId, staff.id));
    expect(audit.some((a) => a.action === 'permissions.set' && a.actorId === owner.id)).toBe(true);
  });

  it('replaces rather than merges', async () => {
    const db = getDb(env.DB);
    const owner = await employee(db, { owner: true });
    const staff = await employee(db);

    await setPermissions(db, owner, staff.id, PRESETS.Manager!);
    await setPermissions(db, owner, staff.id, { ...emptyGrid(), customers: 'view' });

    const after = (await getEmployee(db, staff.id))!;
    expect(after.permissions.orders).toBe('none');
    expect(after.permissions.customers).toBe('view');
  });

  it('refuses a non-owner', async () => {
    const db = getDb(env.DB);
    const owner = await employee(db, { owner: true });
    const staff = await employee(db);
    const other = await employee(db);

    // Even with settings=manage, a non-owner cannot write permissions.
    await setPermissions(db, owner, staff.id, { ...emptyGrid(), settings: 'manage' });
    const empowered = (await getEmployee(db, staff.id))!;

    expect(await setPermissions(db, empowered, other.id, PRESETS.Owner!)).toEqual({
      ok: false,
      reason: 'not-owner',
    });
  });

  it('refuses self-edit, even by an owner', async () => {
    const db = getDb(env.DB);
    const owner = await employee(db, { owner: true });

    expect(await setPermissions(db, owner, owner.id, PRESETS.Owner!)).toEqual({
      ok: false,
      reason: 'self-edit',
    });
  });

  it('takes effect on the next read without re-login', async () => {
    const db = getDb(env.DB);
    const owner = await employee(db, { owner: true });
    const staff = await employee(db);

    await setPermissions(db, owner, staff.id, { ...emptyGrid(), orders: 'manage' });
    expect(can((await getEmployee(db, staff.id))!, 'orders', 'manage')).toBe(true);

    await setPermissions(db, owner, staff.id, emptyGrid());
    expect(can((await getEmployee(db, staff.id))!, 'orders', 'view')).toBe(false);
  });
});

describe('protecting the last owner', () => {
  /**
   * The guard exists for a stale actor. An ACTIVE owner acting on someone else
   * implies at least two owners exist, so the ordinary path can never remove the
   * last one. The dangerous case is an actor whose snapshot still says "owner"
   * after they were demoted — their next request would otherwise take the real
   * last owner down with them.
   */
  it('refuses to demote the last owner when the actor is stale', async () => {
    const db = getDb(env.DB);
    await db.delete(schema.adminUser);
    const staleOwner = await employee(db, { owner: true });
    const realOwner = await employee(db, { owner: true });

    // staleOwner is demoted in the database; their in-memory snapshot is not.
    await db
      .update(schema.adminUser)
      .set({ isOwner: false })
      .where(eq(schema.adminUser.id, staleOwner.id));

    // Rejected outright: the actor is re-read and is no longer an owner.
    expect(await setOwner(db, staleOwner, realOwner.id, false)).toEqual({
      ok: false,
      reason: 'not-owner',
    });

    const owners = await db
      .select()
      .from(schema.adminUser)
      .where(eq(schema.adminUser.isOwner, true));
    expect(owners).toHaveLength(1);
    expect(owners[0]!.id).toBe(realOwner.id);
  });

  it('refuses to deactivate the last owner when the actor is stale', async () => {
    const db = getDb(env.DB);
    await db.delete(schema.adminUser);
    const staleOwner = await employee(db, { owner: true });
    const realOwner = await employee(db, { owner: true });

    await db
      .update(schema.adminUser)
      .set({ active: false })
      .where(eq(schema.adminUser.id, staleOwner.id));

    expect(await setEmployeeActive(db, staleOwner, realOwner.id, false)).toEqual({
      ok: false,
      reason: 'not-owner',
    });

    const [still] = await db
      .select()
      .from(schema.adminUser)
      .where(eq(schema.adminUser.id, realOwner.id));
    expect(still!.active).toBe(true);
  });

  it('demoting one of two owners is allowed and leaves the other standing', async () => {
    const db = getDb(env.DB);
    await db.delete(schema.adminUser);
    const a = await employee(db, { owner: true });
    const b = await employee(db, { owner: true });

    expect(await setOwner(db, a, b.id, false)).toEqual({ ok: true });

    const owners = await db
      .select()
      .from(schema.adminUser)
      .where(eq(schema.adminUser.isOwner, true));
    expect(owners.map((o) => o.id)).toEqual([a.id]);
  });

  it('never leaves zero active owners under concurrent demotions', async () => {
    const db = getDb(env.DB);
    await db.delete(schema.adminUser);
    const a = await employee(db, { owner: true });
    const b = await employee(db, { owner: true });
    const c = await employee(db, { owner: true });

    // a tries to demote both others at the same instant.
    await Promise.all([setOwner(db, a, b.id, false), setOwner(db, a, c.id, false)]);

    const owners = await db
      .select()
      .from(schema.adminUser)
      .where(eq(schema.adminUser.isOwner, true));
    expect(owners.length).toBeGreaterThanOrEqual(1);
    expect(owners.some((o) => o.id === a.id)).toBe(true);
  });

  it('an owner cannot deactivate or demote themselves', async () => {
    const db = getDb(env.DB);
    await db.delete(schema.adminUser);
    const owner = await employee(db, { owner: true });

    expect(await setOwner(db, owner, owner.id, false)).toEqual({ ok: false, reason: 'self-edit' });
    expect(await setEmployeeActive(db, owner, owner.id, false)).toEqual({
      ok: false,
      reason: 'self-edit',
    });
  });
});

describe('isTempPasswordExpired', () => {
  const issued = new Date('2026-01-01T00:00:00Z');

  it('is not expired inside the window', () => {
    expect(isTempPasswordExpired(true, issued, issued.getTime() + TEMP_PASSWORD_TTL_MS - 1000)).toBe(
      false,
    );
  });

  it('expires past the window', () => {
    expect(isTempPasswordExpired(true, issued, issued.getTime() + TEMP_PASSWORD_TTL_MS + 1000)).toBe(
      true,
    );
  });

  it('never expires a password the employee already changed', () => {
    expect(isTempPasswordExpired(false, issued, issued.getTime() + TEMP_PASSWORD_TTL_MS * 10)).toBe(
      false,
    );
  });

  it('treats a missing issue date as not expired rather than locking someone out', () => {
    expect(isTempPasswordExpired(true, null)).toBe(false);
  });
});
