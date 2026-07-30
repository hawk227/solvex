import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { nextCookies } from 'better-auth/next-js';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { eq } from 'drizzle-orm';
import { APIError } from 'better-auth/api';
import { isTempPasswordExpired, schema } from '@solvex/db';
import { db } from './cf';

/**
 * Admin authentication for the CMS.
 *
 * Deliberately separate from customer auth (Phase 3): different tables,
 * different cookie, different secret. An admin session must never be usable
 * as a customer session.
 *
 * Sign-up is disabled — admins are created by the seed script or invited by an
 * existing admin. A public signup endpoint on the back-office would be a way
 * in for anyone who finds the URL.
 */
/**
 * Wrangler secrets and .dev.vars land in the Cloudflare env, NOT in process.env,
 * which is where Better Auth looks by default. They must be passed explicitly
 * or the session secret would be silently unset in production.
 */
function authEnv() {
  const env = getCloudflareContext().env as unknown as {
    BETTER_AUTH_SECRET?: string;
    BETTER_AUTH_URL?: string;
  };
  if (!env.BETTER_AUTH_SECRET) {
    throw new Error('BETTER_AUTH_SECRET is not set. Refusing to sign sessions with no secret.');
  }
  return { secret: env.BETTER_AUTH_SECRET, baseURL: env.BETTER_AUTH_URL };
}

export function auth() {
  const { secret, baseURL } = authEnv();

  return betterAuth({
    secret,
    ...(baseURL ? { baseURL } : {}),
    database: drizzleAdapter(db(), {
      provider: 'sqlite',
      schema: {
        user: schema.adminUser,
        session: schema.adminSession,
        account: schema.adminAccount,
        verification: schema.adminVerification,
      },
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      // Admins are vetted internally; there is no mailbox round-trip to make.
      requireEmailVerification: false,
      minPasswordLength: 12,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    advanced: {
      cookiePrefix: 'solvex-admin',
    },
    databaseHooks: {
      session: {
        create: {
          /**
           * Refuse a session for a deactivated account, or one whose temporary
           * password has gone stale unused. Checked at sign-in as well as on
           * every request, so a stale credential shared over chat stops working
           * rather than lingering indefinitely.
           */
          async before(session) {
            const [row] = await db()
              .select({
                active: schema.adminUser.active,
                mustChangePassword: schema.adminUser.mustChangePassword,
                issuedAt: schema.adminUser.tempPasswordIssuedAt,
              })
              .from(schema.adminUser)
              .where(eq(schema.adminUser.id, session.userId))
              .limit(1);

            if (!row || !row.active) {
              throw new APIError('UNAUTHORIZED', { message: 'This account is not active.' });
            }
            if (isTempPasswordExpired(row.mustChangePassword, row.issuedAt)) {
              throw new APIError('UNAUTHORIZED', {
                message: 'This temporary password has expired. Ask an owner for a new one.',
              });
            }

            await db()
              .update(schema.adminUser)
              .set({ lastLoginAt: new Date() })
              .where(eq(schema.adminUser.id, session.userId));

            return { data: session };
          },
        },
      },
    },
    plugins: [nextCookies()],
  });
}

export type AdminAuth = ReturnType<typeof auth>;
