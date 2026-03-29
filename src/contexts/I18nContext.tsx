'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LOCALE_COOKIE_NAME } from '@/lib/locale';
import type { SupportedLocale } from '@/lib/validations';

export type Messages = Record<string, string>;

type I18nContextValue = {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: string) => string;
  allMessages: Record<SupportedLocale, Messages>;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const DEFAULT_LOCALE: SupportedLocale = 'en';

export function I18nProvider({
  initialLocale,
  allMessages,
  children,
}: {
  initialLocale: SupportedLocale;
  allMessages: Record<SupportedLocale, Messages>;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<SupportedLocale>(initialLocale);

  useEffect(() => {
    setLocaleState(initialLocale);
  }, [initialLocale]);

  const setLocale = useCallback((next: SupportedLocale) => {
    setLocaleState(next);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = next;
      /** Guest + client switches: persist for next request / full navigation (root layout reads this cookie). */
      document.cookie = `${LOCALE_COOKIE_NAME}=${next};path=/;max-age=31536000;SameSite=Lax`;
    }
  }, []);

  const t = useCallback(
    (key: string): string => {
      const messages = allMessages[locale] ?? allMessages[DEFAULT_LOCALE];
      return messages[key] ?? allMessages[DEFAULT_LOCALE]?.[key] ?? key;
    },
    [locale, allMessages]
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t, allMessages }),
    [locale, setLocale, t, allMessages]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}

/** Safe hook that returns null if used outside provider (e.g. in shell before provider mounts). */
export function useI18nOptional(): I18nContextValue | null {
  return useContext(I18nContext);
}
