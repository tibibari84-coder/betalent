/**
 * Monetization rule structure for BETALENT.
 * contentType affects monetization eligibility.
 * Future: original = full earning; cover = limited earning (licensing).
 * Do not hard block yet – structure only.
 */

export type ContentTypeKey =
  | 'ORIGINAL'
  | 'COVER'
  | 'REMIX'
  | 'FREESTYLE'
  | 'DUET'
  | 'OTHER';

/** Monetization tier by content type. Used for future earnings split logic. */
export const CONTENT_TYPE_MONETIZATION_TIER: Record<ContentTypeKey, 'full' | 'limited'> = {
  ORIGINAL: 'full',
  COVER: 'limited',
  REMIX: 'limited',
  FREESTYLE: 'full',
  DUET: 'limited',
  OTHER: 'full',
};

/** Whether content type is eligible for full monetization (no licensing split). */
export function isFullMonetizationEligible(contentType: ContentTypeKey): boolean {
  return contentType === 'ORIGINAL' || contentType === 'FREESTYLE' || contentType === 'OTHER';
}

/** Future: earnings multiplier by content type. 1.0 = full; <1.0 when licensing applies. */
export function getMonetizationMultiplier(contentType: ContentTypeKey): number {
  return isFullMonetizationEligible(contentType) ? 1.0 : 1.0;
}
