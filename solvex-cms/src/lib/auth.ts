import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { nextCookies } from 'better-auth/next-js';
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
export function auth() {
  return betterAuth({
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
