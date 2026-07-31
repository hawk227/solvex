/**
 * HTML for transactional email.
 *
 * Email clients are not browsers, and this file is written for the worst of
 * them rather than the best:
 *
 *  - Tables for layout. Flexbox and grid are unsupported in Outlook's Word
 *    rendering engine, which is still what a lot of desktop Outlook uses.
 *  - Every style inlined. Gmail strips <style> blocks in some contexts, and a
 *    stylesheet that survives on one client and not another is worse than none.
 *  - The verification code is TEXT, never an image. Most clients block remote
 *    images by default, and a code nobody can read is a signup nobody
 *    completes. Same reason the logo is a styled wordmark rather than a file.
 *  - Explicit background AND foreground on every element. Dark-mode clients
 *    invert what they can infer, and a colour set on only one side becomes
 *    black text on black.
 *  - 600px, the width every client has handled for twenty years.
 *
 * Plain text is always sent alongside. Some people read mail as text, some
 * clients degrade to it, and spam filters treat an HTML-only message as a
 * signal in its own right.
 */

const BRAND = {
  primary: '#ff6300',
  ink: '#0f172a',
  muted: '#717182',
  surface: '#f8fafc',
  card: '#ffffff',
  border: '#e6e8ec',
} as const;

/** Shared shell so every message we send looks like it came from one place. */
function layout(options: { previewText: string; body: string }): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>SolveX</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.surface};">
<!-- Preview text: what the inbox shows beside the subject. Without it, clients
     scrape the first words of the body, which reads like a mistake. -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${options.previewText}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.surface};">
  <tr>
    <td align="center" style="padding:32px 16px;">

      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">

        <!-- Wordmark, set as text so it survives blocked images -->
        <tr>
          <td align="center" style="padding-bottom:24px;">
            <span style="font-family:Helvetica,Arial,sans-serif;font-size:26px;font-weight:700;letter-spacing:-0.5px;color:${BRAND.ink};">solve<span style="color:${BRAND.primary};">X</span></span>
          </td>
        </tr>

        <tr>
          <td style="background-color:${BRAND.card};border:1px solid ${BRAND.border};border-radius:12px;padding:36px 32px;">
            ${options.body}
          </td>
        </tr>

        <tr>
          <td align="center" style="padding-top:24px;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:18px;color:${BRAND.muted};">
            SolveX — appliance servicing across Dhaka<br>
            You received this because someone entered this address on
            <a href="https://solvex.ltd" style="color:${BRAND.muted};text-decoration:underline;">solvex.ltd</a>.
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/**
 * The code block.
 *
 * Large, monospaced and letter-spaced because the job is transcription: people
 * read this on one device and type it on another, and 0/O and 1/l are where
 * that goes wrong.
 */
function codeBlock(code: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;">
              <tr>
                <td align="center" style="background-color:${BRAND.surface};border:1px solid ${BRAND.border};border-radius:10px;padding:22px 16px;">
                  <div style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:34px;font-weight:700;letter-spacing:8px;color:${BRAND.ink};">${code}</div>
                </td>
              </tr>
            </table>`;
}

const H1 = `font-family:Helvetica,Arial,sans-serif;font-size:20px;font-weight:600;line-height:28px;color:${BRAND.ink};margin:0 0 12px;`;
const P = `font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:23px;color:${BRAND.ink};margin:0 0 12px;`;
const SMALL = `font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:20px;color:${BRAND.muted};margin:0;`;

export function otpHtml(code: string): string {
  return layout({
    previewText: `${code} is your SolveX verification code`,
    body: `<h1 style="${H1}">Confirm your email</h1>
            <p style="${P}">Enter this code on SolveX to finish setting up your account.</p>
            ${codeBlock(code)}
            <p style="${SMALL}">The code expires in 10 minutes. If you did not request it, you can ignore this email — nothing has been created.</p>`,
  });
}

export function passwordResetHtml(code: string): string {
  return layout({
    previewText: `${code} is your SolveX password reset code`,
    body: `<h1 style="${H1}">Reset your password</h1>
            <p style="${P}">Enter this code on SolveX to choose a new password.</p>
            ${codeBlock(code)}
            <p style="${SMALL}">The code expires in 10 minutes. If you did not ask for a reset, ignore this email and your password stays as it is.</p>`,
  });
}
