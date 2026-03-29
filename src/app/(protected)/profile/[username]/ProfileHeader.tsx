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

const cardShadow = 'shadow-[0_8px_22px_rgba(0,0,0,0.28)]';

const btnPrimary =
  cn(
    'inline-flex h-[44px] flex-1 touch-manipulation items-center justify-center gap-2 rounded-full',
    'bg-[#E31B23] text-[14px] font-semibold text-white',
    'shadow-[0_8px_22px_rgba(0,0,0,0.28)]',
    'transition-all duration-150 ease-out',
    'hover:brightness-110 active:scale-[0.98]'
  );
const btnSecondary =
  cn(
    'inline-flex h-[44px] flex-1 touch-manipulation items-center justify-center gap-2 rounded-full',
    'border border-white/10 bg-white/5 text-[14px] font-semibold text-white backdrop-blur-[14px]',
    'shadow-[0_8px_22px_rgba(0,0,0,0.28)]',
    'transition-all duration-150 ease-out',
    'hover:bg-white/[0.08] active:scale-[0.98]'
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
    <header className="w-full min-w-0">
      <div className="flex flex-col items-center px-4 pb-2 pt-6">
        <div
          className={cn(
            'relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full',
            'border border-white/10 bg-white/5 backdrop-blur-[14px]',
            cardShadow
          )}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="avatar-image h-full w-full object-cover" />
          ) : (
            <UserRound className="text-white/85" size={64} strokeWidth={1.5} aria-hidden />
          )}
        </div>

        <div className="mt-4 flex max-w-full flex-wrap items-center justify-center gap-2">
          <h1 className="text-center font-display text-2xl font-bold tracking-tight text-white">{displayName}</h1>
          {flag ? <span className="text-[22px] leading-none">{flag}</span> : null}
          <VerifiedBadge verified={!!isVerified} verificationLevel={verificationLevel ?? undefined} size="md" />
        </div>
        <p className="mt-1 font-sans text-gray-500">{handle}</p>
      </div>

      <div className="mt-6 flex gap-3 px-4">
        {isOwner ? (
          <>
            <Link href="/settings" className={btnPrimary}>
              <Pencil className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
              Edit profile
            </Link>
            <button type="button" className={btnSecondary} onClick={() => setShareOpen(true)}>
              <Share2 className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
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
                className="!flex !h-[44px] min-h-0 w-full flex-1 !rounded-full !border-0 !bg-[#E31B23] !px-4 !text-[14px] !font-semibold !shadow-[0_8px_22px_rgba(0,0,0,0.28)] !transition-all !duration-150 !ease-out"
              />
            ) : null}
            {creatorId ? (
              <Link href={inboxThreadPath(creatorId)} className={btnSecondary}>
                <MessageCircle className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
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
        <p className="mt-5 px-4 text-center font-sans text-[14px] leading-relaxed text-gray-400">{bioTrimmed}</p>
      ) : isOwner ? (
        <p className="mt-5 px-4 text-center font-sans text-[14px] italic text-gray-600">
          <Link
            href="/settings"
            className="font-medium text-[#E31B23]/90 underline-offset-2 transition-all duration-150 ease-out hover:underline"
          >
            Add a bio in Settings
          </Link>
        </p>
      ) : null}

      {memberSinceLabel ? (
        <p className="mt-3 px-4 text-center font-sans text-[11px] font-medium uppercase tracking-wider text-gray-600">
          Member since {memberSinceLabel}
        </p>
      ) : null}
    </header>
  );
}
