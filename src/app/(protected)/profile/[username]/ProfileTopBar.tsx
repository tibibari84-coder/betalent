'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Share2 } from 'lucide-react';
import { IconArrowLeft } from '@/components/ui/Icons';
import ShareModal from '@/components/shared/ShareModal';
import type { ShareVideoPreview } from '@/components/shared/ShareModal';
import ProfileMoreMenu from './ProfileMoreMenu';
import { cn } from '@/lib/utils';

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

  const iconBtn =
    'flex h-10 min-h-[40px] w-10 min-w-[40px] touch-manipulation items-center justify-center rounded-xl text-gray-400 transition-all duration-150 ease-out hover:bg-white/5 hover:text-white active:bg-white/10';

  return (
    <>
      <header
        className={cn(
          'safe-area-top sticky top-0 z-40 flex min-h-[56px] items-center justify-between border-b border-white/[0.06] px-4 py-2',
          'shadow-[0_8px_22px_rgba(0,0,0,0.28)] backdrop-blur-xl'
        )}
        style={{
          background: 'rgba(18, 18, 22, 0.84)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex min-w-0 items-center gap-2">
          {showBack ? (
            <button type="button" onClick={() => router.back()} className={iconBtn} aria-label="Back">
              <IconArrowLeft className="h-5 w-5 text-white" />
            </button>
          ) : (
            <div className="w-10" aria-hidden />
          )}
        </div>

        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setShareOpen(true)} className={iconBtn} aria-label="Share profile">
            <Share2 className="h-5 w-5" strokeWidth={1.5} />
          </button>
          <button type="button" onClick={() => setMoreOpen(true)} className={iconBtn} aria-label="More options">
            <MoreHorizontal className="h-5 w-5" strokeWidth={1.5} />
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
