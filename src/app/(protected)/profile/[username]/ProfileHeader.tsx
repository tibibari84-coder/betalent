'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { MessageCircle, Pencil, Share2, UserRound } from 'lucide-react';
import VerifiedBadge from '@/components/shared/VerifiedBadge';
import FollowButton from '@/components/profile/FollowButton';
import { getFlagEmoji } from '@/lib/countries';
import { inboxThreadPath } from '@/lib/chat-navigation';
import ShareModal from '@/components/shared/ShareModal';
import type { ShareVideoPreview } from '@/components/shared/ShareModal';
import { cn } from '@/lib/utils';

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

const btnPrimary = cn(
  'inline-flex h-11 min-h-[44px] flex-1 touch-manipulation items-center justify-center gap-2 rounded-full',
  'bg-[#B01028] text-[14px] font-semibold text-white',
  'shadow-[0_4px_24px_rgba(176,16,40,0.35)]',
  'transition-all duration-200 ease-out',
  'hover:bg-[#c41230] active:scale-[0.98]'
);
const btnSecondary = cn(
  'inline-flex h-11 min-h-[44px] flex-1 touch-manipulation items-center justify-center gap-2 rounded-full',
  'border border-white/[0.12] bg-white/[0.04] text-[14px] font-semibold text-white',
  'backdrop-blur-md transition-all duration-200 ease-out',
  'hover:bg-white/[0.08] active:scale-[0.98]'
);
const btnIcon = cn(
  'inline-flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-full',
  'border border-white/[0.12] bg-white/[0.04] text-white backdrop-blur-md',
  'transition-all duration-200 hover:bg-white/[0.08] active:scale-[0.98]'
);

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
    <header className="w-full min-w-0 border-b border-white/[0.05] pb-1">
      <div className="flex flex-col items-center px-4 pb-1 pt-2">
        <div
          className={cn(
            'relative flex h-[104px] w-[104px] shrink-0 items-center justify-center overflow-hidden rounded-full',
            'ring-2 ring-white/[0.08] ring-offset-2 ring-offset-[#050505]',
            'bg-gradient-to-b from-white/[0.08] to-white/[0.02]'
          )}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="avatar-image h-full w-full object-cover" />
          ) : (
            <UserRound className="text-white/50" size={52} strokeWidth={1.25} aria-hidden />
          )}
        </div>

        <div className="mt-4 flex max-w-full flex-wrap items-center justify-center gap-2">
          <h1 className="text-center font-display text-[1.65rem] font-bold leading-tight tracking-tight text-white">
            {displayName}
          </h1>
          {flag ? <span className="text-[20px] leading-none" aria-hidden>{flag}</span> : null}
          <VerifiedBadge verified={!!isVerified} verificationLevel={verificationLevel ?? undefined} size="md" />
        </div>
        <p className="mt-1 font-sans text-[14px] text-white/45">{handle}</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 px-4">
        {isOwner ? (
          <>
            <Link href="/settings" className={btnPrimary}>
              <Pencil className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.75} aria-hidden />
              Edit profile
            </Link>
            <button type="button" className={btnSecondary} onClick={() => setShareOpen(true)}>
              <Share2 className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
              Share
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
                className="!flex !h-11 min-h-[44px] min-w-0 flex-[1.2] !rounded-full !border-0 !bg-[#B01028] !px-4 !text-[14px] !font-semibold !shadow-[0_4px_24px_rgba(176,16,40,0.35)] !transition-all !duration-200"
              />
            ) : null}
            {creatorId ? (
              <Link href={inboxThreadPath(creatorId)} className={btnSecondary}>
                <MessageCircle className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                Message
              </Link>
            ) : null}
            <button type="button" className={btnIcon} onClick={() => setShareOpen(true)} aria-label="Share profile">
              <Share2 className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
            </button>
          </>
        )}
      </div>

      {isOwner ? (
        <div className="mt-3 px-4 text-center">
          <Link
            href="/wallet"
            className="text-[12px] font-medium text-white/35 transition-colors hover:text-white/55"
          >
            Wallet
          </Link>
        </div>
      ) : null}

      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        shareUrl={shareUrl}
        preview={sharePreview}
        subtitle="Share this profile"
        trackResource={{ resourceType: 'profile', resourceId: username }}
      />

      {bioTrimmed ? (
        <p className="mt-4 px-5 text-center font-sans text-[14px] leading-relaxed text-white/55">{bioTrimmed}</p>
      ) : isOwner ? (
        <p className="mt-4 px-5 text-center font-sans text-[13px] text-white/35">
          <Link
            href="/settings"
            className="font-medium text-[#c41230]/95 underline-offset-2 transition-colors hover:underline"
          >
            Add a bio in Settings
          </Link>
        </p>
      ) : null}

      {memberSinceLabel ? (
        <p className="mt-3 px-4 pb-2 text-center font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">
          Member since {memberSinceLabel}
        </p>
      ) : null}
    </header>
  );
}
