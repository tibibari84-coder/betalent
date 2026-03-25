'use client';

import { useEffect } from 'react';
import { I18nProvider } from '@/contexts/I18nContext';
import { LOCALE_COOKIE_NAME } from '@/lib/locale';
import type { SupportedLocale } from '@/lib/validations';
import type { Messages } from '@/contexts/I18nContext';

export function I18nLayoutWrapper({
  initialLocale,
  allMessages,
  children,
}: {
  initialLocale: SupportedLocale;
  allMessages: Record<SupportedLocale, Messages>;
  children: React.ReactNode;
}) {
  useEffect(() => {
    document.cookie = `${LOCALE_COOKIE_NAME}=${initialLocale};path=/;max-age=31536000;SameSite=Lax`;
  }, [initialLocale]);

  return (
    <I18nProvider initialLocale={initialLocale} allMessages={allMessages}>
      {children}
    </I18nProvider>
  );
}
