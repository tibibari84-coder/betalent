'use client';

import Link from 'next/link';
import {
  ACCENT_PRIMARY_GRADIENT,
  accentAlpha,
} from '@/constants/accent-tokens';
import { useI18n } from '@/contexts/I18nContext';
import { LanguageSelector } from '@/components/i18n/LanguageSelector';
import { AuthCardHeader, AuthDivider, GoogleContinueButton } from '@/components/auth/AuthExperience';

export function WelcomeAuthCard() {
  const { t } = useI18n();

  return (
    <>
      <AuthCardHeader
        eyebrow={t('welcome.joinEyebrow')}
        title={t('welcome.joinTitle')}
        subtitle={t('welcome.joinSubtitle')}
      />
      <div className="mb-5 flex flex-col gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/40">{t('i18n.language')}</p>
        <LanguageSelector compact align="right" className="self-end sm:self-auto" />
      </div>
      <div className="space-y-3">
        <Link
          href="/register"
          className="google-btn relative z-[2] flex w-full items-center justify-center gap-2.5 min-h-[48px] rounded-[15px] text-[14px] font-semibold text-white transition-all"
          style={{
            background: ACCENT_PRIMARY_GRADIENT,
            boxShadow: `0 2px 12px ${accentAlpha(0.25)}`,
          }}
        >
          {t('auth.register')}
        </Link>
        <Link
          href="/login"
          className="flex w-full items-center justify-center gap-2.5 min-h-[48px] rounded-[15px] border border-white/[0.09] bg-white/[0.035] text-[14px] font-medium text-text-primary/95 hover:bg-white/[0.07]"
        >
          {t('auth.signIn')}
        </Link>
      </div>
      <AuthDivider />
      <GoogleContinueButton />
    </>
  );
}
