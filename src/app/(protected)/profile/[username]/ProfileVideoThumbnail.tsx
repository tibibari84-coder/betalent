'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IconPlay, IconEye } from '@/components/ui/Icons';
import { usePerformanceModal } from '@/contexts/PerformanceModalContext';
import VideoActionsMenu from '@/components/video/VideoActionsMenu';

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

interface ProfileVideoThumbnailProps {
  id: string;
  title: string;
  thumbnailUrl?: string | null;
  viewsCount: number;
  processingLabel?: string | null;
  onOpenModal?: (videoId: string) => void;
  /** Owner-only: enables 3-dots with delete / visibility */
  creatorId?: string;
  visibility?: 'PUBLIC' | 'PRIVATE';
  commentPermission?: 'EVERYONE' | 'FOLLOWERS' | 'FOLLOWING' | 'OFF';
  showOwnerMenu?: boolean;
}

export default function ProfileVideoThumbnail({
  id,
  title,
  thumbnailUrl,
  viewsCount,
  processingLabel,
  onOpenModal,
  creatorId,
  visibility = 'PUBLIC',
  commentPermission,
  showOwnerMenu,
}: ProfileVideoThumbnailProps) {
  const router = useRouter();
  const { openModal: openPerformanceModal } = usePerformanceModal();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    (onOpenModal ?? openPerformanceModal)(id);
  };

  return (
    <div
      className="group relative aspect-[9/16] w-full min-w-0 rounded-[12px] overflow-hidden border border-[rgba(255,255,255,0.08)] transition-[border-color,box-shadow] duration-200 hover:border-accent/35 hover:shadow-[0_8px_28px_rgba(0,0,0,0.45)]"
      style={{
        background: 'rgba(26,26,28,0.6)',
      }}
    >
      <Link
        href={`/video/${id}`}
        onClick={handleClick}
        className="absolute inset-0 z-0 block"
        aria-label={title}
      />
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-4xl text-text-muted/50 pointer-events-none">
          🎬
        </div>
      )}
      {showOwnerMenu && creatorId ? (
        <div
          className="absolute top-1.5 right-1.5 z-20"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <VideoActionsMenu
            videoId={id}
            title={title}
            creatorId={creatorId}
            visibility={visibility}
            commentPermission={commentPermission}
            compact
            onRemoved={() => {
              router.refresh();
            }}
          />
        </div>
      ) : null}
      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%, transparent 70%, rgba(0,0,0,0.2) 100%)',
        }}
      />
      <div
        className="absolute bottom-1.5 right-1.5 z-[1] flex items-center gap-1 rounded-[6px] px-1.5 py-0.5 min-h-[22px] pointer-events-none"
        style={{
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(6px)',
        }}
      >
        <IconEye className="w-3.5 h-3.5 text-white/90" aria-hidden />
        <span className="text-[11px] font-medium text-white tabular-nums">
          {formatCount(viewsCount)}
        </span>
      </div>
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity pointer-events-none z-[1]">
        <span
          className="flex items-center justify-center w-12 h-12 rounded-full"
          style={{
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          <IconPlay className="w-6 h-6 text-white ml-0.5" fill="currentColor" />
        </span>
      </div>
      {processingLabel && (
        <span
          className="absolute top-1.5 left-1.5 z-[1] inline-flex items-center h-5 px-2 rounded-[6px] text-[10px] font-semibold pointer-events-none max-w-[calc(100%-3rem)] truncate"
          style={{
            background: 'rgba(255,255,255,0.2)',
            color: '#e2e8f0',
          }}
        >
          {processingLabel}
        </span>
      )}
    </div>
  );
}
