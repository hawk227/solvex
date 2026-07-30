import { count, eq } from 'drizzle-orm';
import { schema } from '@solvex/db';
import { auth } from '@/lib/auth';
import { db } from '@/lib/cf';
import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * Creates the very first admin. Deliberately narrow:
 *
 *  - refuses unless `admin_user` is empty, so it is a one-shot door that
 *    closes permanently the moment an admin exists;
 *  - requires the `SETUP_TOKEN` secret, compared in constant time;
 *  - refuses entirely if `SETUP_TOKEN` is unset, so a missing secret fails
 *    closed rather than leaving the route open.
 *
 * Every further admin is invited from inside the CMS.
 */

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i]! ^ bb[i]!;
  return diff === 0;
}

export async function POST(req: Request) {
  const env = getCloudflareContext().env as unknown as { SETUP_TOKEN?: string };
  const expected = env.SETUP_TOKEN;

  if (!expected) {
    return Response.json({ error: 'Setup is not enabled.' }, { status: 404 });
  }

  const provided = req.headers.get('x-setup-token') ?? '';
  if (!timingSafeEqual(provided, expected)) {
    return Response.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const [existing] = await db().select({ n: count() }).from(schema.adminUser);
  if ((existing?.n ?? 0) > 0) {
    return Response.json({ error: 'An admin already exists.' }, { status: 410 });
  }

  let body: { email?: string; password?: string; name?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { email, password, name } = body;
  if (!email || !password || !name) {
    return Response.json({ error: 'name, email and password are required.' }, { status: 400 });
  }
  if (password.length < 12) {
    return Response.json({ error: 'Password must be at least 12 characters.' }, { status: 400 });
  }

  const ctx = await auth().$context;
  const user = await ctx.internalAdapter.createUser({
    email,
    name,
    emailVerified: true,
  });
  await ctx.internalAdapter.createAccount({
    userId: user.id,
    providerId: 'credential',
    accountId: user.id,
    password: await ctx.password.hash(password),
  });

  // The first account is an Owner: full access, and the only role that can
  // administer employees. Without this nobody could ever grant anyone anything.
  await db()
    .update(schema.adminUser)
    .set({ isOwner: true, active: true, mustChangePassword: false })
    .where(eq(schema.adminUser.id, user.id));

  return Response.json({ ok: true, id: user.id, email: user.email }, { status: 201 });
}
