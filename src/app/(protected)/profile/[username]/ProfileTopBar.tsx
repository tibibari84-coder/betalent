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
        className="sticky top-0 z-40 flex items-center justify-between min-h-[56px] px-4 py-2 safe-area-top"
        style={{
          background: 'rgba(7,7,7,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {showBack ? (
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center justify-center w-10 h-10 min-w-[40px] min-h-[40px] rounded-[12px] text-text-primary hover:bg-white/5 active:bg-white/8 transition-colors"
              aria-label="Back"
            >
              <IconArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-10" aria-hidden />
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="flex items-center justify-center w-10 h-10 min-w-[40px] min-h-[40px] rounded-[12px] text-text-secondary hover:text-text-primary hover:bg-white/5 active:bg-white/8 transition-colors"
            aria-label="Share profile"
          >
            <IconShare className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex items-center justify-center w-10 h-10 min-w-[40px] min-h-[40px] rounded-[12px] text-text-secondary hover:text-text-primary hover:bg-white/5 active:bg-white/8 transition-colors"
            aria-label="More options"
          >
            <IconDotsVertical className="w-5 h-5" />
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
