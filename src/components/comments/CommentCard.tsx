'use client';

import { IconHeart } from '@/components/ui/Icons';

interface CommentCardProps {
  avatarUrl?: string;
  username: string;
  country?: string;
  timestamp: string;
  body: string;
  likeCount?: number;
}

export default function CommentCard({
  avatarUrl,
  username,
  country,
  timestamp,
  body,
  likeCount = 0,
}: CommentCardProps) {
  return (
    <div className="glass-panel glass-panel-sm p-4 min-w-0 overflow-hidden">
      <div className="flex gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full bg-canvas-tertiary overflow-hidden flex-shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt={username} className="avatar-image h-full w-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-secondary text-sm font-medium">
              {username.charAt(0)}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-2 text-[12px] text-text-muted min-w-0">
            <span className="font-medium text-[13px] text-text-primary truncate min-w-0">{username}</span>
            {country && <span className="flex-shrink-0">{country}</span>}
            <span className="flex-shrink-0">{timestamp}</span>
          </div>
          <p className="mt-1 text-[13px] text-text-secondary break-words overflow-hidden leading-relaxed">{body}</p>
          <div className="mt-2 flex items-center gap-4 text-[12px] text-text-muted">
            <button
              type="button"
              className="flex items-center gap-1 text-text-muted hover:text-accent transition-colors"
            >
              <IconHeart className="w-4 h-4" />
              Reply
            </button>
            <button
              type="button"
              className="flex items-center gap-1 text-text-muted hover:text-accent transition-colors"
            >
              <IconHeart className="w-4 h-4" />
              {likeCount}
            </button>
            <button
              type="button"
              className="text-text-muted hover:text-text-secondary transition-colors"
            >
              Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
