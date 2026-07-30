import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { nextCookies } from 'better-auth/next-js';
import { emailOTP } from 'better-auth/plugins';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { createAuthMiddleware } from 'better-auth/api';
import { recordAudit, schema } from '@solvex/db';
import { auditDb, db } from './cf';
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
    /**
     * Customer sign-in, sign-up, sign-out and OTP verification.
     *
     * These are Better Auth's own routes, called from the client, so no server
     * action of ours runs on them — this middleware is the only thing that sees
     * a failed password or a wrong OTP.
     */
    hooks: {
      after: createAuthMiddleware(async (ctx) => {
        const ACTIONS: Record<string, string> = {
          '/sign-in/email': 'auth.login',
          '/sign-up/email': 'auth.signup',
          '/sign-out': 'auth.logout',
          '/email-otp/verify-email': 'auth.otp.verify',
          '/forget-password': 'auth.password.reset-request',
          '/reset-password': 'auth.password.reset',
        };
        const action = ACTIONS[ctx.path];
        if (!action) return;

        const head = ctx.headers;
        const body = ctx.body as { email?: string } | undefined;
        const session = ctx.context.newSession;
        // Sign-out and the password-reset request succeed without a session;
        // the rest establish one only on success.
        const sessionless = ctx.path === '/sign-out' || ctx.path === '/forget-password';
        const succeeded = sessionless || Boolean(session);

        await recordAudit(auditDb(), {
          app: 'WEB',
          actorType: session?.user ? 'CUSTOMER' : 'ANON',
          actorId: session?.user?.id ?? null,
          actorName: session?.user?.name ?? null,
          // On a failure the submitted email is the only identifier available,
          // and it shows which account was being targeted.
          actorEmail: session?.user?.email ?? body?.email ?? null,
          action,
          outcome: succeeded ? 'OK' : 'DENIED',
          reason: succeeded ? null : 'rejected',
          ip: head?.get('cf-connecting-ip') ?? head?.get('x-forwarded-for') ?? null,
          userAgent: head?.get('user-agent') ?? null,
        });
      }),
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
