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
      <div className="mb-4 flex justify-end sm:justify-start">
        <LanguageSelector compact align="right" />
      </div>
      <div className="space-y-3">
        <Link
          href="/register"
          className="google-btn relative z-[2] flex w-full items-center justify-center gap-2.5 min-h-[48px] rounded-[14px] text-[14px] font-semibold text-white transition-all"
          style={{
            background: ACCENT_PRIMARY_GRADIENT,
            boxShadow: `0 2px 12px ${accentAlpha(0.25)}`,
          }}
        >
          {t('auth.register')}
        </Link>
        <Link
          href="/login"
          className="flex w-full items-center justify-center gap-2.5 min-h-[48px] rounded-[14px] border border-white/[0.12] bg-white/[0.04] text-[14px] font-medium text-text-primary/95 hover:bg-white/[0.08]"
        >
          {t('auth.signIn')}
        </Link>
      </div>
      <AuthDivider />
      <GoogleContinueButton />
    </>
  );
}
