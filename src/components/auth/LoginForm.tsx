'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '@/contexts/I18nContext';
import {
  AuthTextField,
  AuthPasswordField,
  AuthPrimaryButton,
  AuthTrustStrip,
  AuthAlert,
} from '@/components/auth/AuthExperience';

const REMEMBER_EMAIL_KEY = 'betalent_login_email';

const GOOGLE_ERROR_COPY: Record<string, string> = {
  google_access_denied: 'Google sign-in was cancelled.',
  google_email_unverified: 'That Google account’s email isn’t verified with Google. Use a verified Google account or sign in with email.',
  google_account_conflict: 'This Google account can’t be linked automatically. If you already use BETALENT with this email, sign in with your password or contact support.',
  google_not_configured:
    'Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env or .env.local, set NEXT_PUBLIC_APP_URL, add the redirect URI in Google Cloud Console, restart the dev server — then try again. You can still use email and password.',
  google_config:
    'Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env or .env.local, set NEXT_PUBLIC_APP_URL, add the redirect URI in Google Cloud Console, restart the dev server — then try again. You can still use email and password.',
  google_failed: 'Google sign-in didn’t complete. Try again or use your email and password.',
  google_state: 'That sign-in link expired. Please try again.',
  google_state_expired: 'That sign-in link expired. Please try again.',
  google_bad_request: 'Something went wrong starting Google sign-in. Please try again.',
};

function mapLoginError(message: string, t: (k: string) => string): string {
  const m = message.toLowerCase();
  if (m.includes('too many')) {
    return 'Too many attempts from this network or account. Please wait before trying again.';
  }
  return message || t('auth.errorLoginFailed');
}

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const rawFrom = searchParams?.get('from');
  const redirectTo =
    typeof rawFrom === 'string' && rawFrom.startsWith('/') && !rawFrom.startsWith('//')
      ? rawFrom
      : '/feed';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (saved) setEmail(saved);
  }, []);

  useEffect(() => {
    const err = searchParams?.get('error');
    if (err) {
      setError(GOOGLE_ERROR_COPY[err] ?? 'Sign-in could not be completed.');
    }
    if (searchParams?.get('verified') === '1') {
      setInfo('Email verified. You can sign in.');
    }
    if (searchParams?.get('reset') === '1') {
      setInfo('Password updated. Sign in with your new password.');
    }
    if (searchParams?.get('notice') === 'verify') {
      setInfo(
        'Confirm your email to use protected areas (dashboard, uploads, wallet, settings, and similar). Open the link we sent or resend from the verification screen.',
      );
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(mapLoginError(data.message ?? '', t));
        return;
      }
      if (data.needs2FA) {
        const from = redirectTo.startsWith('/') ? redirectTo : '/explore';
        router.push(`/login/2fa?from=${encodeURIComponent(from)}`);
        router.refresh();
        return;
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem(REMEMBER_EMAIL_KEY, email);
      }
      const next =
        data.user && !data.user.emailVerified
          ? `/verify-email?required=1&from=${encodeURIComponent(redirectTo.startsWith('/') ? redirectTo : '/feed')}`
          : redirectTo.startsWith('/')
            ? redirectTo
            : '/feed';
      router.push(next);
      router.refresh();
    } catch {
      setError(t('auth.errorSomethingWrong'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      {info ? <AuthAlert tone="success">{info}</AuthAlert> : null}
      {error ? <AuthAlert tone="error">{error}</AuthAlert> : null}

      <AuthTextField
        id="login-email"
        label={t('auth.email')}
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="email"
        required
      />

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="login-password" className="text-[13px] font-medium text-white/75">
            {t('auth.password')}
          </label>
          <Link
            href="/forgot-password"
            className="text-[12px] font-medium text-accent/90 hover:text-accent transition-colors"
          >
            Forgot password?
          </Link>
        </div>
        <AuthPasswordField
          id="login-password"
          label=""
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />
      </div>

      <AuthTrustStrip />

      <AuthPrimaryButton loading={loading}>{loading ? t('auth.signingIn') : t('auth.signIn')}</AuthPrimaryButton>

      <p className="text-center text-[14px] text-white/55 pt-1">
        {t('auth.noAccount')}{' '}
        <Link href="/register" className="font-semibold text-accent hover:text-accent-hover transition-colors">
          {t('auth.createOne')}
        </Link>
      </p>
    </form>
  );
}
