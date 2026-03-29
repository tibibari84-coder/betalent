'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { IconPaperAirplane, IconSettings } from '@/components/ui/Icons';
import VerifiedBadge from '@/components/shared/VerifiedBadge';
import FollowButton from '@/components/profile/FollowButton';
import { getFlagEmoji } from '@/lib/countries';
import { inboxThreadPath } from '@/lib/chat-navigation';
import ShareModal from '@/components/shared/ShareModal';
import type { ShareVideoPreview } from '@/components/shared/ShareModal';

interface ProfileHeaderProps {
  displayName: string;
  username: string;
  countryCode?: string | null;
  subtitle?: string | null;
  bio: string;
  avatarUrl?: string | null;
  isVerified?: boolean;
  verificationLevel?: string | null;
  creatorId?: string | null;
  initialFollowing?: boolean;
  memberSinceLabel?: string | null;
  isOwner?: boolean;
}

const btnPrimary =
  'inline-flex h-[44px] flex-1 touch-manipulation items-center justify-center rounded-full bg-[#E31B23] text-[14px] font-semibold text-white shadow-[0_0_15px_rgba(227,27,35,0.4)] transition-all active:scale-[0.98] [@media(hover:hover)]:hover:brightness-110';
const btnSecondary =
  'inline-flex h-[44px] flex-1 touch-manipulation items-center justify-center rounded-full border border-white/10 bg-[#1A1A1A] text-[14px] font-semibold text-white transition-all active:scale-[0.98] [@media(hover:hover)]:hover:bg-white/[0.06]';

export default function ProfileHeader({
  displayName,
  username,
  countryCode,
  subtitle: _subtitle,
  bio,
  avatarUrl,
  isVerified,
  verificationLevel,
  creatorId,
  initialFollowing = false,
  memberSinceLabel,
  isOwner = false,
}: ProfileHeaderProps) {
  const flag = getFlagEmoji(countryCode);
  const handle = `@${username}`;
  const bioTrimmed = bio?.trim() ?? '';
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') setShareUrl(window.location.href);
  }, [shareOpen]);

  const sharePreview: ShareVideoPreview = {
    title: 'Profile',
    creatorName: displayName ?? 'Creator',
  };

  return (
    <header className="w-full min-w-0">
      {/* Hero — red → black gradient + bottom curve */}
      <div className="relative h-[260px] w-full overflow-hidden rounded-b-[36px]">
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#E31B23] via-[#450a0c] to-black"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black to-transparent"
          aria-hidden
        />
        <div className="relative z-10 flex h-full flex-col items-center px-4 pt-[max(24px,env(safe-area-inset-top))]">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-white/20 bg-black/20 shadow-[0_8px_32px_rgba(0,0,0,0.45)]">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="avatar-image h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-white/50">
                {displayName.charAt(0)}
              </div>
            )}
          </div>
          <div className="mt-4 flex max-w-full flex-wrap items-center justify-center gap-2">
            <h1 className="text-center text-[20px] font-bold tracking-tight text-white">{displayName}</h1>
            {flag ? <span className="text-[22px] leading-none">{flag}</span> : null}
            <VerifiedBadge verified={!!isVerified} verificationLevel={verificationLevel ?? undefined} size="md" />
          </div>
          <p className="mt-1 text-[14px] font-medium text-gray-500">{handle}</p>
        </div>
      </div>

      {/* Primary actions */}
      <div className="mt-6 flex gap-3 px-4">
        {isOwner ? (
          <>
            <Link href="/settings" className={btnPrimary}>
              <IconSettings className="mr-2 h-4 w-4 shrink-0" aria-hidden />
              Edit profile
            </Link>
            <button type="button" className={btnSecondary} onClick={() => setShareOpen(true)}>
              Share profile
            </button>
          </>
        ) : (
          <>
            {creatorId ? (
              <FollowButton
                targetId={creatorId}
                initialFollowing={initialFollowing}
                variant="primary"
                size="default"
                className="!flex !h-[44px] min-h-0 w-full flex-1 !rounded-full !border-0 !bg-[#E31B23] !px-4 !text-[14px] !font-semibold !shadow-[0_0_15px_rgba(227,27,35,0.4)]"
              />
            ) : null}
            {creatorId ? (
              <Link href={inboxThreadPath(creatorId)} className={btnSecondary}>
                <IconPaperAirplane className="mr-2 h-4 w-4 shrink-0" aria-hidden />
                Message
              </Link>
            ) : null}
          </>
        )}
      </div>

      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        shareUrl={shareUrl}
        preview={sharePreview}
        subtitle="Share this profile"
        trackResource={{ resourceType: 'profile', resourceId: username }}
      />

      {bioTrimmed ? (
        <p className="mt-5 px-4 text-center text-[14px] leading-relaxed text-gray-400">{bioTrimmed}</p>
      ) : isOwner ? (
        <p className="mt-5 px-4 text-center text-[14px] italic text-gray-600">
          <Link href="/settings" className="font-medium text-[#E31B23]/90 underline-offset-2 hover:underline">
            Add a bio in Settings
          </Link>
        </p>
      ) : null}

      {memberSinceLabel ? (
        <p className="mt-3 px-4 text-center text-[11px] font-medium uppercase tracking-wider text-gray-600">
          Member since {memberSinceLabel}
        </p>
      ) : null}
    </header>
  );
}
