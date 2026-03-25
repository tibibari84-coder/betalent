'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ROUTES } from '@/constants/app';
import { validatePasswordPolicy } from '@/lib/validations';
import { useI18n } from '@/contexts/I18nContext';
import { SUPPORTED_LOCALES } from '@/lib/validations';
import { LOCALE_LABELS } from '@/constants/locales';
import { getBrowserLocaleClient } from '@/lib/locale';
import CountrySelect from '@/components/ui/CountrySelect';
import type { SupportedLocale } from '@/lib/validations';
import {
  AuthTextField,
  AuthPasswordField,
  AuthPrimaryButton,
  AuthAlert,
  PasswordStrengthMeter,
} from '@/components/auth/AuthExperience';

const selectAuthClass =
  'w-full min-h-[48px] pl-4 pr-10 rounded-[14px] bg-black/35 border border-white/[0.08] text-[15px] text-text-primary focus:border-[rgba(196,18,47,0.45)] focus:ring-2 focus:ring-[rgba(196,18,47,0.2)] focus:outline-none appearance-none cursor-pointer bg-no-repeat bg-[length:12px] bg-[right_14px_center]';

interface RegisterFormProps {
  referrerId?: string;
  /** Set when /api/auth/google redirected here because OAuth env is missing */
  googleConfigError?: boolean;
}

export default function RegisterForm({ referrerId, googleConfigError }: RegisterFormProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    countryCode: '',
    talentType: '',
    preferredLocale: 'en' as SupportedLocale,
    agreeToPolicies: false,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setForm((f) => ({ ...f, preferredLocale: getBrowserLocaleClient() }));
  }, []);

  useEffect(() => {
    if (googleConfigError) {
      setError(
        'Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env or .env.local, set NEXT_PUBLIC_APP_URL, add the redirect URI in Google Cloud Console, restart the dev server — then try again. You can still register with email and password.',
      );
    }
  }, [googleConfigError]); // google_not_configured | google_config (legacy)

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!/^([a-zA-Z0-9_]{3,30})$/.test(form.username)) {
      e.username = '3–30 characters: letters, numbers, underscore only.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = 'Enter a valid email address.';
    }
    const pwPolicy = validatePasswordPolicy(form.password);
    if (!pwPolicy.ok) {
      e.password = pwPolicy.message;
    }
    if (form.password !== form.confirmPassword) {
      e.confirmPassword = 'Passwords must match.';
    }
    if (!form.displayName.trim()) {
      e.displayName = 'Display name is required.';
    }
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setError('');
    if (!form.agreeToPolicies) {
      setError(t('auth.errorAgreePolicies'));
      return;
    }
    if (!validate()) return;

    setLoading(true);
    try {
      const body = {
        username: form.username,
        email: form.email,
        password: form.password,
        confirmPassword: form.confirmPassword,
        displayName: form.displayName.trim(),
        fairPlayPolicyAccepted: true,
        termsAccepted: true,
        preferredLocale: form.preferredLocale,
        ...(form.countryCode && { countryCode: form.countryCode }),
        ...(form.talentType && { talentType: form.talentType }),
        ...(referrerId && { referrerId }),
      };
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.message ?? t('auth.errorRegistrationFailed');
        if (res.status === 429) {
          setError('Too many signup attempts from this device. Please try again in an hour.');
        } else {
          setError(msg);
        }
        return;
      }
      const q = new URLSearchParams({ registered: '1' });
      if (data.verificationEmailSent === false) {
        q.set('email', 'pending');
        if (typeof window !== 'undefined' && typeof data.verificationEmailHint === 'string' && data.verificationEmailHint) {
          try {
            sessionStorage.setItem('betalent_register_email_hint', data.verificationEmailHint);
          } catch {
            /* ignore quota / private mode */
          }
        }
      }
      router.push(`/verify-email?${q.toString()}`);
      router.refresh();
    } catch {
      setError(t('auth.errorSomethingWrong'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      {error ? <AuthAlert tone="error">{error}</AuthAlert> : null}

      <div className="space-y-1.5">
        <label htmlFor="reg-locale" className="block text-[13px] font-medium text-white/75">
          {t('auth.preferredLanguage')}
        </label>
        <select
          id="reg-locale"
          value={form.preferredLocale}
          onChange={(e) => setForm((f) => ({ ...f, preferredLocale: e.target.value as SupportedLocale }))}
          className={selectAuthClass}
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E\")",
          }}
        >
          {SUPPORTED_LOCALES.map((code) => (
            <option key={code} value={code}>
              {LOCALE_LABELS[code]}
            </option>
          ))}
        </select>
      </div>

      <AuthTextField
        id="reg-username"
        label={t('auth.username')}
        value={form.username}
        onChange={(v) => {
          setForm((f) => ({ ...f, username: v }));
          if (fieldErrors.username) setFieldErrors((fe) => ({ ...fe, username: '' }));
        }}
        error={fieldErrors.username}
        autoComplete="username"
        hint="3–30 characters: letters, numbers, underscore."
        required
      />

      <AuthTextField
        id="reg-email"
        label={t('auth.email')}
        type="email"
        value={form.email}
        onChange={(v) => {
          setForm((f) => ({ ...f, email: v }));
          if (fieldErrors.email) setFieldErrors((fe) => ({ ...fe, email: '' }));
        }}
        error={fieldErrors.email}
        autoComplete="email"
        required
      />

      <div className="space-y-3">
        <AuthPasswordField
          id="reg-password"
          label={t('auth.password')}
          value={form.password}
          onChange={(v) => {
            setForm((f) => ({ ...f, password: v }));
            if (fieldErrors.password) setFieldErrors((fe) => ({ ...fe, password: '' }));
          }}
          autoComplete="new-password"
          error={fieldErrors.password}
        />
        {form.password.length > 0 ? <PasswordStrengthMeter password={form.password} /> : null}
      </div>

      <AuthPasswordField
        id="reg-confirm"
        label="Confirm password"
        value={form.confirmPassword}
        onChange={(v) => {
          setForm((f) => ({ ...f, confirmPassword: v }));
          if (fieldErrors.confirmPassword) setFieldErrors((fe) => ({ ...fe, confirmPassword: '' }));
        }}
        autoComplete="new-password"
        error={fieldErrors.confirmPassword}
        placeholder="Repeat password"
      />

      <AuthTextField
        id="reg-display"
        label={t('auth.displayName')}
        value={form.displayName}
        onChange={(v) => {
          setForm((f) => ({ ...f, displayName: v }));
          if (fieldErrors.displayName) setFieldErrors((fe) => ({ ...fe, displayName: '' }));
        }}
        error={fieldErrors.displayName}
        required
      />

      <div className="space-y-1.5">
        <label htmlFor="country" className="block text-[13px] font-medium text-white/75">
          {t('common.countryOptional')}
        </label>
        <CountrySelect
          id="country"
          value={form.countryCode}
          onChange={(code) => setForm((f) => ({ ...f, countryCode: code }))}
          placeholder={t('common.countryPlaceholder')}
          aria-label={t('common.countryOptional')}
          buttonClassName="w-full min-h-[48px] px-4 rounded-[14px] bg-black/35 border border-white/[0.08] text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-[rgba(196,18,47,0.2)] focus:border-[rgba(196,18,47,0.45)]"
        />
      </div>

      <AuthTextField
        id="reg-talent"
        label={t('common.talentTypeOptional')}
        value={form.talentType}
        onChange={(v) => setForm((f) => ({ ...f, talentType: v }))}
        hint="Optional. Short label for your craft."
      />

      <div className="rounded-[14px] bg-black/30 border border-white/[0.08] p-4 space-y-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.agreeToPolicies}
            onChange={(e) => setForm((f) => ({ ...f, agreeToPolicies: e.target.checked }))}
            className="mt-1 h-4 w-4 rounded border-white/25 bg-black/40 text-accent focus:ring-accent/40"
          />
          <span className="text-[13px] leading-relaxed text-text-secondary/95">
            I agree to the{' '}
            <Link
              href={ROUTES.LEGAL_TERMS}
              className="text-accent hover:text-accent-hover underline underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link
              href={ROUTES.LEGAL_CREATOR_RULES}
              className="text-accent hover:text-accent-hover underline underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              Creator Rules
            </Link>
            .
          </span>
        </label>
        <p className="text-[12px] text-white/40 pl-7 leading-relaxed">
          Fair Play and Content policies apply. Violations may lead to removal or account restrictions.
        </p>
      </div>

      <AuthPrimaryButton loading={loading}>{loading ? t('auth.creatingAccount') : t('auth.createAccount')}</AuthPrimaryButton>

      <p className="text-center text-[14px] text-white/55 pt-1">
        {t('auth.alreadyHaveAccount')}{' '}
        <Link href="/login" className="font-semibold text-accent hover:text-accent-hover transition-colors">
          {t('auth.signIn')}
        </Link>
      </p>
    </form>
  );
}
