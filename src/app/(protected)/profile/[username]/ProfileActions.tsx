'use client';

import { useState, useEffect } from 'react';
import FollowButton from '@/components/profile/FollowButton';
import { IconShare, IconDotsVertical } from '@/components/ui/Icons';
import ShareModal from '@/components/shared/ShareModal';
import type { ShareVideoPreview } from '@/components/shared/ShareModal';

interface ProfileActionsProps {
  profileId: string;
  initialFollowing?: boolean;
  /** Optional: display name for share preview. */
  displayName?: string;
}

export default function ProfileActions({ profileId, initialFollowing = false, displayName }: ProfileActionsProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') setShareUrl(window.location.href);
  }, []);

  const sharePreview: ShareVideoPreview = {
    title: 'Profile',
    creatorName: displayName ?? 'Creator',
  };

  return (
    <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
      <FollowButton targetId={profileId} initialFollowing={initialFollowing} variant="primary" />
      <button
        type="button"
        onClick={() => setShareOpen(true)}
        className="flex items-center gap-2 px-4 py-3 rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-transparent text-text-primary hover:bg-white/5 transition-colors min-h-[44px]"
        aria-label="Share"
      >
        <IconShare className="w-5 h-5" />
        <span className="text-[14px] font-medium">Share</span>
      </button>
      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        shareUrl={shareUrl}
        preview={sharePreview}
        subtitle="Share this profile"
        trackResource={{ resourceType: 'profile', resourceId: profileId }}
      />
      <button
        type="button"
        className="w-10 h-10 rounded-[12px] flex items-center justify-center border border-[rgba(255,255,255,0.08)] bg-transparent text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
        aria-label="More options"
      >
        <IconDotsVertical className="w-5 h-5" />
      </button>
    </div>
  );
}
