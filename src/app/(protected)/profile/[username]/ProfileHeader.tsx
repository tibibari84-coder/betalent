'use client';

import Link from 'next/link';
import { IconGift, IconPaperAirplane, IconSettings } from '@/components/ui/Icons';
import VerifiedBadge from '@/components/shared/VerifiedBadge';
import FollowButton from '@/components/profile/FollowButton';
import { getFlagEmoji } from '@/lib/countries';
import { useChatPanelOptional } from '@/contexts/ChatPanelContext';

interface ProfileHeaderProps {
  displayName: string;
  username: string;
  countryCode?: string | null;
  /** One line: talentType • country — only when at least one real value exists */
  subtitle?: string | null;
  bio: string;
  avatarUrl?: string | null;
  isVerified?: boolean;
  verificationLevel?: string | null;
  creatorId?: string | null;
  initialFollowing?: boolean;
  /** Formatted from account createdAt — e.g. "March 2026" — never placeholder */
  memberSinceLabel?: string | null;
  isOwner?: boolean;
}

export default function ProfileHeader({
  displayName,
  username,
  countryCode,
  subtitle,
  bio,
  avatarUrl,
  isVerified,
  verificationLevel,
  creatorId,
  initialFollowing = false,
  memberSinceLabel,
  isOwner = false,
}: ProfileHeaderProps) {
  const chatPanel = useChatPanelOptional();
  const flag = getFlagEmoji(countryCode);
  const handle = `@${username}`;
  const bioTrimmed = bio?.trim() ?? '';

  return (
    <header
      className="relative w-full overflow-hidden rounded-3xl px-4 md:px-5 laptop:px-6 lg:px-8 py-6 md:py-7"
      style={{
        background:
          'radial-gradient(circle at 0% 0%, rgba(196,18,47,0.32), transparent 55%), radial-gradient(circle at 100% 0%, rgba(196,18,47,0.22), transparent 60%), linear-gradient(180deg, rgba(10,12,18,0.98) 0%, rgba(5,6,10,1) 100%)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.9), inset 0 0 120px rgba(255,255,255,0.02)',
      }}
    >
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[280px] max-w-[90vw] h-[120px] opacity-10 pointer-events-none z-[-1]"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(177,18,38,0.12) 0%, transparent 70%)',
        }}
        aria-hidden
      />

      <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start w-full gap-6 md:gap-8">
        <div className="flex-shrink-0">
          <div
            className="relative w-[124px] h-[124px] sm:w-[140px] sm:h-[140px] mx-auto md:mx-0 rounded-full overflow-hidden flex items-center justify-center text-4xl font-bold text-text-muted"
            style={{
              boxShadow: '0 0 0 2px rgba(255,255,255,0.06), 0 0 36px rgba(196,18,47,0.75)',
              background:
                'radial-gradient(circle at 30% 0%, rgba(255,255,255,0.08), transparent 70%), radial-gradient(circle at 70% 100%, rgba(196,18,47,0.4), transparent 70%)',
            }}
          >
            <div className="absolute inset-[3px] rounded-full overflow-hidden bg-canvas-tertiary flex items-center justify-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="avatar-image h-full w-full" />
              ) : (
                displayName.charAt(0)
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0 text-center md:text-left max-w-[560px] overflow-hidden">
          <div className="flex flex-col items-center md:items-start gap-1 mb-2 min-w-0">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 min-w-0">
              <h1 className="font-display text-[26px] sm:text-[30px] laptop:text-[32px] font-semibold text-white flex items-center gap-2 min-w-0 max-w-full overflow-hidden">
                <span className="truncate">{displayName}</span>
                {flag && <span aria-hidden className="text-[26px] flex-shrink-0">{flag}</span>}
              </h1>
              <VerifiedBadge verified={!!isVerified} verificationLevel={verificationLevel ?? undefined} size="lg" />
            </div>
            <p className="text-[13px] text-text-muted flex items-center gap-2">
              <span className="font-mono text-text-secondary/90">{handle}</span>
            </p>
          </div>

          {subtitle ? (
            <p className="text-[14px] mb-3 truncate" style={{ color: '#9ba7b8' }}>
              {subtitle}
            </p>
          ) : null}

          {bioTrimmed ? (
            <p className="text-[14px] text-left leading-relaxed break-words overflow-hidden" style={{ color: '#B7BDC7' }}>
              {bioTrimmed}
            </p>
          ) : (
            <p className="text-[14px] text-left italic" style={{ color: '#6b7280' }}>
              {isOwner ? (
                <Link href="/settings" className="text-accent/90 hover:text-accent underline-offset-2 hover:underline not-italic font-medium">
                  Add a bio in Settings
                </Link>
              ) : (
                'No bio yet'
              )}
            </p>
          )}

          {memberSinceLabel ? (
            <div className="mt-4 flex flex-wrap gap-2 justify-center md:justify-start">
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: '#9ca3af',
                }}
              >
                Member since {memberSinceLabel}
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex flex-shrink-0 flex-wrap items-center justify-center gap-2 md:gap-3">
          {isOwner ? (
            <>
              <Link
                href="/settings"
                className="h-10 px-4 rounded-[999px] font-semibold text-[14px] text-white flex items-center gap-2 transition-all hover:opacity-95 hover:shadow-[0_10px_30px_rgba(177,18,38,0.45)]"
                style={{
                  background: 'linear-gradient(135deg,#c4122f,#e11d48)',
                  boxShadow: '0 10px 30px rgba(196,18,47,0.55)',
                }}
              >
                <IconSettings className="w-4 h-4" />
                Edit profile
              </Link>
              <button
                type="button"
                className="h-10 px-4 rounded-[999px] font-medium text-[14px] text-white border border-[rgba(255,255,255,0.18)] opacity-70 cursor-not-allowed"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                <span className="flex items-center gap-2">
                  <IconPaperAirplane className="w-4 h-4" />
                  Share profile
                </span>
              </button>
            </>
          ) : (
            <>
              {creatorId && (
                <FollowButton
                  targetId={creatorId}
                  initialFollowing={initialFollowing}
                  variant="primary"
                  size="default"
                  className="h-10 px-4 rounded-[999px] text-[14px]"
                />
              )}
              {creatorId && chatPanel ? (
                <button
                  type="button"
                  onClick={() =>
                    chatPanel.openWithPeer(creatorId, {
                      id: creatorId,
                      username,
                      displayName,
                      avatarUrl: avatarUrl ?? null,
                    })
                  }
                  className="h-10 px-4 rounded-[999px] font-medium text-[14px] text-white border border-[rgba(255,255,255,0.18)] transition-colors hover:bg-white/10"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  <span className="flex items-center gap-2">
                    <IconPaperAirplane className="w-4 h-4" />
                    Message
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="h-10 px-4 rounded-[999px] font-medium text-[14px] text-white border border-[rgba(255,255,255,0.18)] opacity-70 cursor-not-allowed"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                  title="Sign in to message creators."
                >
                  <span className="flex items-center gap-2">
                    <IconPaperAirplane className="w-4 h-4" />
                    Message
                  </span>
                </button>
              )}
              <button
                type="button"
                disabled
                className="h-10 w-10 rounded-[12px] flex items-center justify-center border border-[rgba(255,255,255,0.18)] text-text-secondary opacity-70 cursor-not-allowed"
                style={{ background: 'rgba(255,255,255,0.04)' }}
                aria-label="Gift unavailable"
                title="Profile-level gifting action is not available here."
              >
                <IconGift className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
