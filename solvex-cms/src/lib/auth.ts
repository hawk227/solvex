import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { nextCookies } from 'better-auth/next-js';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { schema } from '@solvex/db';
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
    plugins: [nextCookies()],
  });
}

export type AdminAuth = ReturnType<typeof auth>;
