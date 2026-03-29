'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IconArrowLeft, IconShare, IconDotsVertical } from '@/components/ui/Icons';
import ShareModal from '@/components/shared/ShareModal';
import type { ShareVideoPreview } from '@/components/shared/ShareModal';
import ProfileMoreMenu from './ProfileMoreMenu';

interface ProfileTopBarProps {
  username: string;
  displayName: string;
  isOwner: boolean;
  showBack?: boolean;
}

export default function ProfileTopBar({
  username,
  displayName,
  isOwner,
  showBack = false,
}: ProfileTopBarProps) {
  const router = useRouter();
  const [shareOpen, setShareOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') setShareUrl(window.location.href);
  }, [shareOpen]);

  const sharePreview: ShareVideoPreview = {
    title: 'Profile',
    creatorName: displayName ?? 'Creator',
  };

  return (
    <>
      <header
        className="safe-area-top sticky top-0 z-40 flex min-h-[56px] items-center justify-between border-b border-white/5 bg-black/80 px-4 py-2 backdrop-blur-xl"
        style={{ WebkitBackdropFilter: 'blur(24px)' }}
      >
        <div className="flex min-w-0 items-center gap-2">
          {showBack ? (
            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-10 min-h-[40px] w-10 min-w-[40px] touch-manipulation items-center justify-center rounded-xl text-white transition-colors hover:bg-white/5 active:bg-white/10"
              aria-label="Back"
            >
              <IconArrowLeft className="h-5 w-5" />
            </button>
          ) : (
            <div className="w-10" aria-hidden />
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="flex h-10 min-h-[40px] w-10 min-w-[40px] touch-manipulation items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-white/5 hover:text-white active:bg-white/10"
            aria-label="Share profile"
          >
            <IconShare className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex h-10 min-h-[40px] w-10 min-w-[40px] touch-manipulation items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-white/5 hover:text-white active:bg-white/10"
            aria-label="More options"
          >
            <IconDotsVertical className="h-5 w-5" />
          </button>
        </div>
      </header>

      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        shareUrl={shareUrl}
        preview={sharePreview}
        subtitle="Share this profile"
        trackResource={{ resourceType: 'profile', resourceId: username }}
      />

      <ProfileMoreMenu
        isOpen={moreOpen}
        onClose={() => setMoreOpen(false)}
        isOwner={isOwner}
        onShareProfile={() => setShareOpen(true)}
      />
    </>
  );
}
