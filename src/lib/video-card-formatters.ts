import { getFlagEmoji } from '@/lib/countries';

/**
 * Compact count formatter used in card UIs.
 * Preserves existing behavior: 1K/1M short style.
 */
export function formatCompactCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/**
 * Returns display flag for a country value.
 * - ISO2 code -> emoji flag
 * - non-ISO string -> returned as-is (for already formatted values)
 * - null/empty -> null
 */
export function getDisplayCountryFlag(country?: string | null): string | null {
  if (!country) return null;
  if (country.length === 2 && /^[A-Za-z]{2}$/.test(country)) return getFlagEmoji(country);
  return country;
}
