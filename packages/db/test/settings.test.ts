import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { getDb, schema } from '../src/index';

describe('settings', () => {
  it('round-trips a key/value pair', async () => {
    const db = getDb(env.DB);

    await db.insert(schema.settings).values({ key: 'default_slot_capacity', value: '6' });

    const rows = await db.select().from(schema.settings);

    expect(rows).toEqual([{ key: 'default_slot_capacity', value: '6' }]);
  });
});
