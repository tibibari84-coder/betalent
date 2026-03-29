'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal } from 'lucide-react';
import { IconArrowLeft } from '@/components/ui/Icons';
import ProfileMoreMenu from './ProfileMoreMenu';
import ShareModal from '@/components/shared/ShareModal';
import type { ShareVideoPreview } from '@/components/shared/ShareModal';
import { cn } from '@/lib/utils';

interface ProfileTopBarProps {
  username: string;
  displayName: string;
  isOwner: boolean;
  showBack?: boolean;
}

/**
 * Minimal sticky chrome: back + overflow menu only.
 * Share lives in {@link ProfileHeader} to avoid duplicate CTAs and dashboard noise.
 */
export default function ProfileTopBar({
  username,
  displayName,
  isOwner,
  showBack = false,
}: ProfileTopBarProps) {
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') setShareUrl(window.location.href);
  }, [shareOpen]);

  const sharePreview: ShareVideoPreview = {
    title: 'Profile',
    creatorName: displayName ?? 'Creator',
  };

  const iconBtn =
    'flex h-11 min-h-[44px] w-11 min-w-[44px] touch-manipulation items-center justify-center rounded-xl text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white active:bg-white/[0.1]';

  return (
    <>
      <header
        className={cn(
          'safe-area-top sticky top-0 z-40 flex min-h-[52px] items-center justify-between border-b border-white/[0.06] px-3 py-1.5',
          'bg-[#050505]/90 backdrop-blur-xl supports-[backdrop-filter]:bg-[#050505]/75'
        )}
      >
        <div className="flex min-w-0 items-center">
          {showBack ? (
            <button type="button" onClick={() => router.back()} className={iconBtn} aria-label="Back">
              <IconArrowLeft className="h-5 w-5 text-white" />
            </button>
          ) : (
            <div className="w-11" aria-hidden />
          )}
        </div>

        <button type="button" onClick={() => setMoreOpen(true)} className={iconBtn} aria-label="More options">
          <MoreHorizontal className="h-5 w-5" strokeWidth={1.75} />
        </button>
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
