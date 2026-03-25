/**
 * BETALENT country system — ISO 3166-1 alpha-2.
 * Store only countryCode (e.g. "US") on creator; derive countryName and flagEmoji here.
 */

import countriesData from '@/data/countries.json';

export type Country = {
  code: string;
  name: string;
  flagEmoji: string;
};

export type CountryOption = {
  countryCode: string;
  countryName: string;
  flag: string;
};

const LIST: Country[] = (countriesData as { code: string; name: string }[]).map(
  (c) => ({
    code: c.code,
    name: c.name,
    flagEmoji: countryCodeToFlagEmoji(c.code),
  })
);

const BY_CODE = new Map<string, Country>(LIST.map((c) => [c.code.toUpperCase(), c]));

/**
 * Convert ISO 3166-1 alpha-2 code to regional indicator flag emoji (e.g. US → 🇺🇸).
 * Works for any two uppercase A–Z letters.
 */
export function countryCodeToFlagEmoji(code: string): string {
  if (!code || code.length !== 2) return '';
  const a = 0x1f1e6; // Regional Indicator A
  const A = 65;
  return code
    .toUpperCase()
    .split('')
    .map((char) => String.fromCodePoint(a + char.charCodeAt(0) - A))
    .join('');
}

/**
 * Get country name by ISO alpha-2 code (e.g. "US" → "United States of America").
 */
export function getCountryName(code: string | null | undefined): string {
  if (!code) return '';
  const c = BY_CODE.get(code.toUpperCase());
  return c?.name ?? '';
}

/**
 * Get flag emoji by ISO alpha-2 code (e.g. "US" → "🇺🇸").
 */
export function getFlagEmoji(code: string | null | undefined): string {
  if (!code) return '';
  const c = BY_CODE.get(code.toUpperCase());
  return c?.flagEmoji ?? countryCodeToFlagEmoji(code);
}

/**
 * Get full country record by code.
 */
export function getCountryByCode(code: string | null | undefined): Country | null {
  if (!code) return null;
  return BY_CODE.get(code.toUpperCase()) ?? null;
}

/** Check if a country code is in the supported list (ISO 3166-1 alpha-2). */
export function isValidCountryCode(code: string | null | undefined): boolean {
  if (!code || typeof code !== 'string') return false;
  return BY_CODE.has(code.trim().toUpperCase());
}

/**
 * All countries (ISO 3166-1), with code, name, and flagEmoji.
 */
export function getAllCountries(): Country[] {
  return LIST;
}

/**
 * Full ISO option format for forms/APIs requiring explicit names:
 * { countryCode, countryName, flag }.
 */
export function getAllCountryOptions(): CountryOption[] {
  return LIST.map((c) => ({
    countryCode: c.code,
    countryName: c.name,
    flag: c.flagEmoji,
  }));
}

/**
 * Format "CreatorName 🇺🇸" for profile and cards.
 * If no countryCode, returns displayName only.
 */
export function formatCreatorWithFlag(
  displayName: string,
  countryCode: string | null | undefined
): string {
  const flag = getFlagEmoji(countryCode);
  return flag ? `${displayName} ${flag}` : displayName;
}
