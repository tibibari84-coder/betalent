/**
 * Verified performer system: future-ready constants.
 * CreatorVerification.verificationLevel maps to these.
 */

export type VerificationLevelKey = 'STANDARD_CREATOR' | 'IDENTITY_VERIFIED' | 'TRUSTED_PERFORMER' | 'OFFICIAL_ARTIST';

export const VERIFICATION_LEVEL_LABELS: Record<VerificationLevelKey, string> = {
  STANDARD_CREATOR: 'Creator',
  IDENTITY_VERIFIED: 'Identity verified',
  TRUSTED_PERFORMER: 'Verified performer',
  OFFICIAL_ARTIST: 'Official artist',
};

/** Verified performer = TRUSTED_PERFORMER or higher. Future: badge, monetization perks. */
export const VERIFIED_PERFORMER_LEVELS: VerificationLevelKey[] = ['TRUSTED_PERFORMER', 'OFFICIAL_ARTIST'];
