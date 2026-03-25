/**
 * Transactional email — provider order:
 * 1) Resend (`RESEND_API_KEY`)
 * 2) SendGrid (`SENDGRID_API_KEY`)
 * Production: at least one must be set or verification mail will not send.
 * Dev: logs the message (never silent-fail verification in dev UX).
 */

import { getPublicAppBaseUrlForServerLinks } from '@/lib/public-app-url';

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
  return getPublicAppBaseUrlForServerLinks();
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

export function newLoginAlertEmailContent(params: {
  displayName: string;
  whenISO: string;
  ip: string;
  userAgentSummary: string;
  methodLabel: string;
  settingsUrl: string;
  locale: 'en' | 'hu';
  /** Google linked to an existing email/password account (not a standalone Google sign-in). */
  variant?: 'sign_in' | 'google_linked';
}) {
  const {
    displayName,
    whenISO,
    ip,
    userAgentSummary,
    methodLabel,
    settingsUrl,
    locale,
    variant = 'sign_in',
  } = params;
  const isHu = locale === 'hu';
  const whenHuman = new Date(whenISO).toUTCString();

  if (variant === 'google_linked') {
    const subject = isHu
      ? 'Google-fiók összekapcsolva a BETALENT profiloddal'
      : 'Google account linked to your BETALENT profile';
    const text = isHu
      ? `Szia ${displayName},

Összekapcsoltunk egy Google-fiókot a BETALENT profiloddal.

Időpont (UTC): ${whenHuman}
IP: ${ip}
Eszköz / böngésző (összegzés): ${userAgentSummary}

Ha te kezdeményezted, minden rendben.

Ha nem te voltál, azonnal változtasd meg a jelszavad, és nézd meg a fiókbeállításokat:
${settingsUrl}

— BETALENT`
      : `Hi ${displayName},

A Google account was linked to your BETALENT profile.

Time (UTC): ${whenHuman}
IP address: ${ip}
Device / browser (summary): ${userAgentSummary}

If you did this, no action is needed.

If you didn’t, change your password and review your account in settings:
${settingsUrl}

— BETALENT`;
    const html = isHu
      ? `<p>Szia ${escapeHtml(displayName)},</p>
<p><strong>Összekapcsoltunk egy Google-fiókot</strong> a BETALENT profiloddal.</p>
<ul style="color:#333;line-height:1.5">
<li><strong>Időpont (UTC):</strong> ${escapeHtml(whenHuman)}</li>
<li><strong>IP:</strong> ${escapeHtml(ip)}</li>
<li><strong>Eszköz / böngésző:</strong> ${escapeHtml(userAgentSummary)}</li>
</ul>
<p>Ha te kezdeményezted, nincs teendő.</p>
<p style="color:#666;font-size:13px">Ha nem te voltál, változtasd meg a jelszavad: <a href="${escapeHtml(settingsUrl)}">beállítások</a>.</p>
<p>— BETALENT</p>`
      : `<p>Hi ${escapeHtml(displayName)},</p>
<p>A <strong>Google account was linked</strong> to your BETALENT profile.</p>
<ul style="color:#333;line-height:1.5">
<li><strong>Time (UTC):</strong> ${escapeHtml(whenHuman)}</li>
<li><strong>IP address:</strong> ${escapeHtml(ip)}</li>
<li><strong>Device / browser:</strong> ${escapeHtml(userAgentSummary)}</li>
</ul>
<p>If you did this, no action is needed.</p>
<p style="color:#666;font-size:13px">If you didn’t, change your password in <a href="${escapeHtml(settingsUrl)}">settings</a>.</p>
<p>— BETALENT</p>`;
    return { subject, text, html };
  }

  const subject = isHu ? 'Új bejelentkezés a BETALENT fiókodba' : 'New sign-in to your BETALENT account';

  const text = isHu
    ? `Szia ${displayName},

Észleltünk egy új bejelentkezést a BETALENT fiókodba.

Időpont (UTC): ${whenHuman}
Bejelentkezés módja: ${methodLabel}
IP: ${ip}
Eszköz / böngésző (összegzés): ${userAgentSummary}

Ha te voltál, nyugodtan hagyd figyelmen kívül ezt az üzenetet.

Ha nem te voltál, javasoljuk, hogy azonnal változtasd meg a jelszavad, és ha be van kapcsolva, ellenőrizd a kétlépcsős bejelentkezést a beállításokban:
${settingsUrl}

— BETALENT`
    : `Hi ${displayName},

We noticed a new sign-in to your BETALENT account.

Time (UTC): ${whenHuman}
Sign-in method: ${methodLabel}
IP address: ${ip}
Device / browser (summary): ${userAgentSummary}

If this was you, you can ignore this message.

If this wasn’t you, change your password right away and review two-factor security in settings:
${settingsUrl}

— BETALENT`;

  const html = isHu
    ? `<p>Szia ${escapeHtml(displayName)},</p>
<p>Észleltünk egy <strong>új bejelentkezést</strong> a BETALENT fiókodba.</p>
<ul style="color:#333;line-height:1.5">
<li><strong>Időpont (UTC):</strong> ${escapeHtml(whenHuman)}</li>
<li><strong>Mód:</strong> ${escapeHtml(methodLabel)}</li>
<li><strong>IP:</strong> ${escapeHtml(ip)}</li>
<li><strong>Eszköz / böngésző:</strong> ${escapeHtml(userAgentSummary)}</li>
</ul>
<p>Ha te voltál, nincs teendő.</p>
<p style="color:#666;font-size:13px">Ha nem te voltál, változtasd meg a jelszavad, és nézd meg a <a href="${escapeHtml(settingsUrl)}">beállításokat</a>.</p>
<p>— BETALENT</p>`
    : `<p>Hi ${escapeHtml(displayName)},</p>
<p>We noticed a <strong>new sign-in</strong> to your BETALENT account.</p>
<ul style="color:#333;line-height:1.5">
<li><strong>Time (UTC):</strong> ${escapeHtml(whenHuman)}</li>
<li><strong>Method:</strong> ${escapeHtml(methodLabel)}</li>
<li><strong>IP address:</strong> ${escapeHtml(ip)}</li>
<li><strong>Device / browser:</strong> ${escapeHtml(userAgentSummary)}</li>
</ul>
<p>If this was you, no action is needed.</p>
<p style="color:#666;font-size:13px">If this wasn’t you, change your password and review security in <a href="${escapeHtml(settingsUrl)}">settings</a>.</p>
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
