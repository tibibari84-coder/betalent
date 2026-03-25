/**
 * Central cherry accent tokens.
 * Keep values identical to current approved visuals.
 */

export const ACCENT_HEX = '#c4122f';
export const ACCENT_HOVER_HEX = '#e11d48';
export const ACCENT_DEEP_HEX = '#b11226';

export const ACCENT_RGB = '196,18,47';
export const ACCENT_DEEP_RGB = '177,18,38';
export const ACCENT_SOFT_RGB = '255,70,90';

export function accentAlpha(alpha: number): string {
  return `rgba(${ACCENT_RGB},${alpha})`;
}

export function accentDeepAlpha(alpha: number): string {
  return `rgba(${ACCENT_DEEP_RGB},${alpha})`;
}

export function accentSoftAlpha(alpha: number): string {
  return `rgba(${ACCENT_SOFT_RGB},${alpha})`;
}

export const ACCENT_PRIMARY_GRADIENT = `linear-gradient(135deg, ${ACCENT_HEX}, ${ACCENT_HOVER_HEX})`;
export const ACCENT_BUTTON_GRADIENT = `linear-gradient(135deg, ${ACCENT_DEEP_HEX}, ${ACCENT_HEX})`;
