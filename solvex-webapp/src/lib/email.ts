import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * The single place email leaves this app.
 *
 * Sends through the Cloudflare Email Service `send_email` binding. An earlier
 * version of this file used the REST API instead, on the grounds that the
 * binding required importing `cloudflare:email` — a platform module OpenNext's
 * esbuild pass cannot resolve. That is no longer true: the binding takes a
 * plain object and needs no import, so the REST path bought nothing and cost an
 * API token, two secrets, and a token rotation to remember.
 *
 * Without a binding (local dev, or before the domain is onboarded) the message
 * is logged instead of sent, so signup stays testable end to end. That fallback
 * is DEV ONLY — in production a missing binding throws, because silently not
 * sending a verification code is worse than failing loudly.
 */

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
};

type EmailEnv = {
  /** Cloudflare Email Service binding. Absent in local dev. */
  EMAIL?: {
    send(message: {
      to: string;
      from: { email: string; name?: string };
      subject: string;
      text: string;
      html?: string;
    }): Promise<unknown>;
  };
  /** Sender address. Must be on a domain onboarded to Email Sending. */
  EMAIL_FROM?: string;
  NEXTJS_ENV?: string;
};

export async function sendEmail(message: EmailMessage): Promise<void> {
  const env = getCloudflareContext().env as unknown as EmailEnv;
  const from = env.EMAIL_FROM ?? 'support@solvex.ltd';

  if (!env.EMAIL) {
    // NODE_ENV, not a binding: Next sets it to 'development' under `next dev`
    // and 'production' in a build, in both cases with nothing to configure. An
    // earlier version keyed this on a var that was set nowhere, so a deployed
    // Worker took the development path and logged verification codes to the
    // console instead of emailing them, while still reporting success.
    if (process.env.NODE_ENV !== 'development') {
      throw new Error(
        'Email Service binding (EMAIL) is missing. Refusing to silently drop a transactional email.',
      );
    }
    console.info(`[email:dev] to=${message.to} subject="${message.subject}"\n${message.text}`);
    return;
  }

  // Any throw propagates. A verification code that was never sent must not look
  // like it was.
  await env.EMAIL.send({
    to: message.to,
    from: { email: from, name: 'SolveX' },
    subject: message.subject,
    text: message.text,
  });
}

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
