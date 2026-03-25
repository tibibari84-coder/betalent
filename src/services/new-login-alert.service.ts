import { checkRateLimit } from '@/lib/rate-limit';
import {
  isTransactionalEmailProviderConfigured,
  newLoginAlertEmailContent,
  sendTransactionalEmail,
} from '@/lib/email';
import { getPublicAppBaseUrlForServerLinks } from '@/lib/public-app-url';
import { RATE_LIMIT_NEW_LOGIN_ALERT_EMAIL_PER_USER_PER_HOUR } from '@/constants/anti-cheat';

export type NewLoginMethod = 'password' | 'google' | 'totp';

const WINDOW_MS = 60 * 60 * 1000;

function summarizeUserAgent(ua: string | null | undefined): string {
  if (!ua?.trim()) return 'Unknown device or browser';
  const t = ua.trim();
  return t.length > 120 ? `${t.slice(0, 117)}…` : t;
}

function methodLabel(method: NewLoginMethod, locale?: string | null): string {
  const hu = locale === 'hu';
  if (method === 'google') return hu ? 'Google fiókkal' : 'Google';
  if (method === 'totp') {
    return hu ? 'email, jelszó és authenticator alkalmazás' : 'email, password, and authenticator app';
  }
  return hu ? 'email és jelszó' : 'email and password';
}

/**
 * Sends a “new sign-in” transactional email (TikTok/Facebook-style alert).
 * Fire-and-forget from route handlers; skips when no email provider is configured.
 */
export async function sendNewLoginAlertEmail(options: {
  userId: string;
  email: string;
  displayName: string;
  preferredLocale?: string | null;
  ip: string;
  userAgent: string | null | undefined;
  method: NewLoginMethod;
  /** When an existing account links Google (distinct copy from a normal Google sign-in). */
  googleLinked?: boolean;
}): Promise<void> {
  if (!isTransactionalEmailProviderConfigured()) return;

  const allowed = await checkRateLimit(
    'new-login-alert-email',
    options.userId,
    RATE_LIMIT_NEW_LOGIN_ALERT_EMAIL_PER_USER_PER_HOUR,
    WINDOW_MS
  );
  if (!allowed) {
    console.warn('[new-login-alert] email rate limited', options.userId);
    return;
  }

  const whenISO = new Date().toISOString();
  const base = getPublicAppBaseUrlForServerLinks().replace(/\/$/, '');
  const settingsUrl = `${base}/settings`;

  const variant = options.googleLinked ? 'google_linked' : 'sign_in';
  const { subject, text, html } = newLoginAlertEmailContent({
    displayName: options.displayName,
    whenISO,
    ip: options.ip,
    userAgentSummary: summarizeUserAgent(options.userAgent),
    methodLabel: methodLabel(options.method, options.preferredLocale),
    settingsUrl,
    locale: options.preferredLocale === 'hu' ? 'hu' : 'en',
    variant,
  });

  const result = await sendTransactionalEmail({ to: options.email, subject, text, html });
  if (!result.ok) {
    console.warn('[new-login-alert] email failed', options.userId, result.error);
  }
}
