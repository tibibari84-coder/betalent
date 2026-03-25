import { SUPPORTED_LOCALES } from '@/lib/validations';
import type { SupportedLocale } from '@/lib/validations';

/** Cookie name for guest temporary language preference (optional persistence). */
export const LOCALE_COOKIE_NAME = 'betalent_locale';

/**
 * Map browser locale string to a supported app language.
 * Examples: en-US, en-GB, en-CA → en; es-ES, es-MX → es; fr-FR, fr-CA → fr; hu-HU → hu.
 * Unsupported → null (caller uses 'en' fallback).
 */
function toSupportedLocale(locale: string): SupportedLocale | null {
  const code = locale.trim().split(/[-;]/)[0].toLowerCase().slice(0, 2);
  if (SUPPORTED_LOCALES.includes(code as SupportedLocale)) return code as SupportedLocale;
  return null;
}

/**
 * Parse Accept-Language header and return the first supported locale code (en, es, fr, hu)
 * or null if none match. Uses first listed language; q-values ignored for simplicity.
 */
function firstSupportedFromAcceptLanguage(acceptLanguage: string): SupportedLocale | null {
  const parts = acceptLanguage.split(',').map((p) => p.trim().split(';')[0]);
  for (const part of parts) {
    const supported = toSupportedLocale(part);
    if (supported) return supported;
  }
  return null;
}

/**
 * Resolve UI locale. Priority order (browser must never override explicit user choice):
 * 1. User saved preferredLanguage (session) — always wins when present
 * 2. Browser-detected language (cookie for guest persistence, then Accept-Language header)
 * 3. English fallback
 */
export function resolveLocale(
  userLocale: string | null | undefined,
  acceptLanguageHeader: string | null,
  cookieLocale?: string | null
): SupportedLocale {
  const explicitUser = userLocale?.trim();
  if (explicitUser && SUPPORTED_LOCALES.includes(explicitUser as SupportedLocale)) {
    return explicitUser as SupportedLocale;
  }
  const fromCookie = cookieLocale ? toSupportedLocale(cookieLocale) : null;
  if (fromCookie) return fromCookie;
  const browser = acceptLanguageHeader ? firstSupportedFromAcceptLanguage(acceptLanguageHeader) : null;
  return browser ?? 'en';
}

/**
 * Client-only: get first supported locale from navigator.languages / navigator.language.
 * Maps en-*, es-*, fr-*, hu-* to en, es, fr, hu. Use for registration form preselection.
 * Returns 'en' if unsupported or not in browser.
 */
export function getBrowserLocaleClient(): SupportedLocale {
  if (typeof navigator === 'undefined') return 'en';
  const list = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const lang of list) {
    const supported = toSupportedLocale(String(lang));
    if (supported) return supported;
  }
  return 'en';
}
