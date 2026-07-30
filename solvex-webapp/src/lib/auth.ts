import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { nextCookies } from 'better-auth/next-js';
import { emailOTP } from 'better-auth/plugins';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { schema } from '@solvex/db';
import { db } from './cf';
import { otpEmail, passwordResetEmail, sendEmail } from './email';

/**
 * Customer authentication.
 *
 * Separate from the CMS admin instance in every respect: its own tables, its own
 * cookie prefix, its own secret. A customer session must never authenticate an
 * admin, so there is deliberately no shared code path between them.
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
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    emailAndPassword: {
      enabled: true,
      // Signing up is allowed, but the account cannot be used until the emailed
      // code is confirmed.
      requireEmailVerification: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    advanced: {
      cookiePrefix: 'solvex',
    },
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 60 * 10,
        // Codes are single-use; three wrong tries invalidates the code so a
        // six-digit space cannot be walked through.
        allowedAttempts: 3,
        sendVerificationOnSignUp: true,
        async sendVerificationOTP({ email, otp, type }) {
          const body = type === 'forget-password' ? passwordResetEmail(otp) : otpEmail(otp);
          await sendEmail({ to: email, ...body });
        },
      }),
      nextCookies(),
    ],
  });
}
