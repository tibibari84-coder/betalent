/**
 * Transactional email — provider order:
 * 1) Resend (`RESEND_API_KEY`)
 * 2) SendGrid (`SENDGRID_API_KEY`)
 * Production: at least one must be set or verification mail will not send.
 * Dev: logs the message (never silent-fail verification in dev UX).
 */

function parseMailbox(from: string): { email: string; name?: string } {
  const t = from.trim();
  const angled = t.match(/^(.+?)\s*<([^>]+)>$/);
  if (angled) {
    const name = angled[1].replace(/^["']|["']$/g, '').trim();
    const email = angled[2].trim();
    if (email) return { email, name: name || undefined };
  }
  return { email: t };
}

function appBaseUrl(): string {
  const u =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    process.env.VERCEL_URL?.replace(/\/$/, '') ||
    'http://localhost:3000';
  if (u.startsWith('http')) return u;
  return `https://${u}`;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/** True when Resend or SendGrid is configured (real SMTP delivery). */
export function isTransactionalEmailProviderConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() || process.env.SENDGRID_API_KEY?.trim());
}

export async function sendTransactionalEmail(params: SendEmailParams): Promise<{ ok: boolean; error?: string }> {
  const from = process.env.EMAIL_FROM?.trim() || 'BETALENT <onboarding@resend.dev>';
  const fromParsed = parseMailbox(from);

  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [params.to],
          subject: params.subject,
          text: params.text,
          ...(params.html && { html: params.html }),
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error('[email] Resend error', res.status, errText);
        return { ok: false, error: 'Email provider rejected the message.' };
      }
      return { ok: true };
    } catch (e) {
      console.error('[email] Resend fetch failed', e);
      return { ok: false, error: 'Email send failed.' };
    }
  }

  const sendgridKey = process.env.SENDGRID_API_KEY?.trim();
  if (sendgridKey) {
    try {
      const content: Array<{ type: string; value: string }> = [{ type: 'text/plain', value: params.text }];
      if (params.html) content.push({ type: 'text/html', value: params.html });
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sendgridKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: params.to }] }],
          from: {
            email: fromParsed.email,
            ...(fromParsed.name ? { name: fromParsed.name } : {}),
          },
          subject: params.subject,
          content,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error('[email] SendGrid error', res.status, errText);
        return { ok: false, error: 'Email provider rejected the message.' };
      }
      return { ok: true };
    } catch (e) {
      console.error('[email] SendGrid fetch failed', e);
      return { ok: false, error: 'Email send failed.' };
    }
  }

  if (process.env.NODE_ENV === 'production') {
    console.error(
      '[email] No RESEND_API_KEY or SENDGRID_API_KEY in production — verification emails will not be delivered. Add Resend, SendGrid, or wire AWS SES via a supported HTTP/SMTP bridge.'
    );
    return { ok: false, error: 'Email is not configured.' };
  }

  console.warn(
    '[email] DEV — would send to',
    params.to,
    '\nSubject:',
    params.subject,
    '\n---\n',
    params.text,
    '\n---'
  );
  return { ok: true };
}

export function verificationEmailContent(verifyUrl: string, displayName: string) {
  const subject = 'Confirm your email for BETALENT';
  const text = `Hi ${displayName},

You created a BETALENT account. Confirm that you own this email address by opening the link below (expires in 24 hours):

${verifyUrl}

This confirms you can receive mail at this address — it does not verify legal identity.

If you did not sign up, you can ignore this message.

— BETALENT`;
  const html = `<p>Hi ${escapeHtml(displayName)},</p>
<p>You created a BETALENT account. Confirm that you own this email address:</p>
<p><a href="${escapeHtml(verifyUrl)}">Verify email</a></p>
<p style="color:#666;font-size:13px">This link expires in 24 hours. Confirming your email proves you control this inbox — it is not the same as creator or legal identity verification.</p>
<p style="color:#666;font-size:13px">If you did not sign up, ignore this email.</p>
<p>— BETALENT</p>`;
  return { subject, text, html };
}

export function passwordResetEmailContent(resetUrl: string, displayName: string) {
  const subject = 'Reset your BETALENT password';
  const text = `Hi ${displayName},

We received a request to reset your BETALENT password. Open the link below (expires in 1 hour):

${resetUrl}

If you did not request this, ignore this email.

— BETALENT`;
  const html = `<p>Hi ${escapeHtml(displayName)},</p>
<p>Reset your password:</p>
<p><a href="${escapeHtml(resetUrl)}">Set a new password</a></p>
<p style="color:#666;font-size:13px">This link expires in one hour.</p>
<p>— BETALENT</p>`;
  return { subject, text, html };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export { appBaseUrl };
