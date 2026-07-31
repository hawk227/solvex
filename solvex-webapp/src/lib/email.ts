import { getCloudflareContext } from '@opennextjs/cloudflare';
import { otpHtml, passwordResetHtml } from './email-template';

/**
 * The single place email leaves this app.
 *
 * Sends through Resend. Cloudflare Email Service was the previous transport and
 * turned out to be a paid product; Resend's free tier covers the volume this
 * business will start at, and the swap is contained entirely in this file —
 * which is the reason sending was funnelled through one function to begin with.
 *
 * Without an API key (local dev, or before the key is set) the message is
 * logged instead of sent, so signup stays testable end to end. That fallback is
 * DEV ONLY — in production a missing key throws, because a verification code
 * that was never sent must not look like it was.
 */

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  /**
   * Optional. Always sent alongside `text`, never instead of it — some people
   * read mail as plain text, and an HTML-only message is itself a spam signal.
   */
  html?: string;
};

type EmailEnv = {
  RESEND_API_KEY?: string;
  /**
   * Sender address. Must be on a domain verified in Resend, or sending is
   * rejected for anyone but your own account address.
   */
  EMAIL_FROM?: string;
};

export async function sendEmail(message: EmailMessage): Promise<void> {
  const env = getCloudflareContext().env as unknown as EmailEnv;
  const apiKey = env.RESEND_API_KEY;
  const from = env.EMAIL_FROM ?? 'SolveX <support@solvex.ltd>';

  if (!apiKey) {
    // NODE_ENV, not a Cloudflare var: Next sets it to 'development' under
    // `next dev` and 'production' in a build, in both cases with nothing to
    // configure. An earlier version keyed this on a var that was set nowhere,
    // so a deployed Worker took the development path and logged verification
    // codes to the console while still reporting success.
    if (process.env.NODE_ENV !== 'development') {
      throw new Error(
        'RESEND_API_KEY is not set. Refusing to silently drop a transactional email.',
      );
    }
    console.info(`[email:dev] to=${message.to} subject="${message.subject}"\n${message.text}`);
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      ...(message.html ? { html: message.html } : {}),
    }),
  });

  if (!response.ok) {
    // Resend puts the actual reason in the body — an unverified domain and a
    // bad key both surface as 4xx, and the difference is the whole diagnosis.
    // Truncated so a long HTML error page cannot flood the logs.
    const detail = await response.text().catch(() => '');
    throw new Error(`Resend send failed (${response.status}): ${detail.slice(0, 300)}`);
  }
}

export function otpEmail(code: string): Pick<EmailMessage, 'subject' | 'text' | 'html'> {
  return {
    subject: `${code} is your SolveX verification code`,
    html: otpHtml(code),
    text: [
      `Your SolveX verification code is ${code}.`,
      '',
      'It expires in 10 minutes. If you did not request it, you can ignore this email.',
    ].join('\n'),
  };
}

export function passwordResetEmail(code: string): Pick<EmailMessage, 'subject' | 'text' | 'html'> {
  return {
    subject: `${code} is your SolveX password reset code`,
    html: passwordResetHtml(code),
    text: [
      `Use the code ${code} to reset your SolveX password.`,
      '',
      'It expires in 10 minutes. If you did not request a reset, ignore this email and your password stays unchanged.',
    ].join('\n'),
  };
}
