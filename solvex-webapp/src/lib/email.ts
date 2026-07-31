import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * The single place email leaves this app.
 *
 * Uses the Cloudflare Email Service REST API rather than the Workers
 * `send_email` binding. Two reasons:
 *   1. the binding requires importing `cloudflare:email`, a platform module
 *      OpenNext's esbuild pass cannot resolve;
 *   2. the REST payload is the same shape most providers use, so swapping to
 *      Resend really is an edit to this one file.
 *
 * Without credentials (local dev, or before the domain is onboarded) the message
 * is logged instead of sent, so signup is testable end to end. That fallback is
 * DEV ONLY — in production a missing credential throws, because silently not
 * sending a verification code is worse than failing loudly.
 */

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
};

type EmailEnv = {
  CF_ACCOUNT_ID?: string;
  CF_EMAIL_API_TOKEN?: string;
  EMAIL_FROM?: string;
  NEXTJS_ENV?: string;
};

export async function sendEmail(message: EmailMessage): Promise<void> {
  const env = getCloudflareContext().env as unknown as EmailEnv;
  const { CF_ACCOUNT_ID: accountId, CF_EMAIL_API_TOKEN: token } = env;
  const from = env.EMAIL_FROM ?? 'no-reply@solvex.example';

  if (!accountId || !token) {
    // NODE_ENV, not the NEXTJS_ENV binding: Next sets NODE_ENV to
    // 'development' under `next dev` and 'production' in a build, in both
    // cases without anything needing to be configured. The previous test was
    // `env.NEXTJS_ENV === 'production'`, and that var was set nowhere — so a
    // deployed Worker took the development path, logging the verification code
    // to the console instead of emailing it while still reporting success.
    if (process.env.NODE_ENV !== 'development') {
      throw new Error(
        'Email is not configured (CF_ACCOUNT_ID / CF_EMAIL_API_TOKEN). Refusing to silently drop a transactional email.',
      );
    }
    console.info(`[email:dev] to=${message.to} subject="${message.subject}"\n${message.text}`);
    return;
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/email/sending/send`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: message.to,
        subject: message.subject,
        text: message.text,
      }),
    },
  );

  if (!response.ok) {
    // The body carries the machine-readable reason; include it so a
    // deliverability problem is diagnosable from logs rather than invisible.
    const detail = await response.text().catch(() => '');
    throw new Error(`Email send failed (${response.status}): ${detail.slice(0, 300)}`);
  }
}

/** Verification code email. Kept short: it is read on a phone lock screen. */
export function otpEmail(code: string): Pick<EmailMessage, 'subject' | 'text'> {
  return {
    subject: `${code} is your SolveX verification code`,
    text: [
      `Your SolveX verification code is ${code}.`,
      '',
      'It expires in 10 minutes. If you did not request it, you can ignore this email.',
    ].join('\n'),
  };
}

export function passwordResetEmail(code: string): Pick<EmailMessage, 'subject' | 'text'> {
  return {
    subject: `${code} is your SolveX password reset code`,
    text: [
      `Use the code ${code} to reset your SolveX password.`,
      '',
      'It expires in 10 minutes. If you did not request a reset, ignore this email and your password stays unchanged.',
    ].join('\n'),
  };
}
