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
  /** Location / region line under @handle (e.g. country name). */
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
  'inline-flex h-12 min-h-[48px] flex-1 touch-manipulation items-center justify-center gap-2 rounded-full',
  'bg-[#B01028] text-[14px] font-semibold tracking-tight text-white',
  'shadow-[0_6px_28px_rgba(176,16,40,0.38)]',
  'transition-all duration-200 ease-out',
  'hover:bg-[#c41230] active:scale-[0.98]'
);
const btnSecondary = cn(
  'inline-flex h-12 min-h-[48px] flex-1 touch-manipulation items-center justify-center gap-2 rounded-full',
  'border border-white/[0.1] bg-white/[0.04] text-[14px] font-semibold tracking-tight text-white',
  'backdrop-blur-sm transition-all duration-200 ease-out',
  'hover:bg-white/[0.08] active:scale-[0.98]'
);
const btnIcon = cn(
  'inline-flex h-12 w-12 shrink-0 touch-manipulation items-center justify-center rounded-full',
  'border border-white/[0.1] bg-white/[0.04] text-white backdrop-blur-sm',
  'transition-all duration-200 hover:bg-white/[0.08] active:scale-[0.98]'
);

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
    <header className="w-full min-w-0 px-4 pt-1 pb-5">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'relative flex h-[120px] w-[120px] shrink-0 items-center justify-center overflow-hidden rounded-full',
            'ring-[2.5px] ring-[#B01028]/25 ring-offset-2 ring-offset-[#050505]',
            'bg-gradient-to-b from-white/[0.1] via-white/[0.04] to-transparent shadow-[0_12px_40px_rgba(0,0,0,0.45)]'
          )}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="avatar-image h-full w-full object-cover" />
          ) : (
            <UserRound className="text-white/45" size={56} strokeWidth={1.15} aria-hidden />
          )}
        </div>

        <div className="mt-5 flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <h1 className="text-center font-display text-[1.75rem] font-bold leading-[1.15] tracking-tight text-white">
            {displayName}
          </h1>
          {flag ? <span className="text-[22px] leading-none" aria-hidden>{flag}</span> : null}
          <VerifiedBadge verified={!!isVerified} verificationLevel={verificationLevel ?? undefined} size="md" />
        </div>

        <p className="mt-1.5 font-sans text-[15px] font-medium text-white/50">{handle}</p>

        {subtitle ? (
          <p className="mt-1 max-w-[280px] text-center font-sans text-[13px] text-white/38">{subtitle}</p>
        ) : null}

        <div className="mt-6 flex w-full max-w-[400px] flex-wrap justify-center gap-2">
          {isOwner ? (
            <>
              <Link href="/settings" className={btnPrimary}>
                <Pencil className="h-4 w-4 shrink-0 opacity-95" strokeWidth={1.75} aria-hidden />
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
                  className="!flex !h-12 min-h-[48px] min-w-0 flex-[1.15] !rounded-full !border-0 !bg-[#B01028] !px-5 !text-[14px] !font-semibold !shadow-[0_6px_28px_rgba(176,16,40,0.38)] !transition-all !duration-200"
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
        <p className="mx-auto mt-5 max-w-[340px] text-center font-sans text-[14px] leading-relaxed text-white/52">
          {bioTrimmed}
        </p>
      ) : isOwner ? (
        <p className="mt-5 text-center font-sans text-[13px] text-white/32">
          <Link
            href="/settings"
            className="font-medium text-[#c41230]/90 underline-offset-2 transition-colors hover:underline"
          >
            Add a bio
          </Link>
        </p>
      ) : null}

      {memberSinceLabel ? (
        <p className="mt-4 text-center font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-white/22">
          On BETALENT since {memberSinceLabel}
        </p>
      ) : null}
    </header>
  );
}
