'use client';

import { IconShieldCheck } from '@/components/ui/Icons';

const LEVEL_LABELS: Record<string, string> = {
  STANDARD_CREATOR: 'Standard creator',
  IDENTITY_VERIFIED: 'Identity verified',
  TRUSTED_PERFORMER: 'Trusted performer',
  OFFICIAL_ARTIST: 'Official artist',
};

export interface VerifiedBadgeProps {
  /** When true, shows the trust badge. */
  verified: boolean;
  /** Optional level for tooltip (e.g. "Identity verified", "Official artist"). */
  verificationLevel?: string | null;
  /** Icon size: sm = 3.5, md = 4, lg = 6 (profile). */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Accessibility: defaults to "Verified creator" or level label. */
  ariaLabel?: string;
}

const sizeClass = { sm: 'w-3.5 h-3.5', md: 'w-4 h-4', lg: 'w-6 h-6' };

/**
 * Premium, subtle trust badge for verified creators.
 * Renders nothing when verified is false.
 */
export default function VerifiedBadge({
  verified,
  verificationLevel,
  size = 'md',
  className = '',
  ariaLabel,
}: VerifiedBadgeProps) {
  if (!verified) return null;

  const levelLabel =
    verificationLevel && verificationLevel !== 'STANDARD_CREATOR'
      ? LEVEL_LABELS[verificationLevel] ?? 'Verified creator'
      : 'Verified creator';
  const label = ariaLabel ?? levelLabel;

  return (
    <span
      className={`inline-flex flex-shrink-0 text-accent ${sizeClass[size]} ${className}`}
      title={levelLabel}
      aria-label={label}
      role="img"
    >
      <IconShieldCheck className={`${sizeClass[size]} text-[#c4122f]/90`} aria-hidden />
    </span>
  );
}
