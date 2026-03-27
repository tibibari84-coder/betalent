'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getFlagEmoji } from '@/lib/countries';
import VerifiedBadge from '@/components/shared/VerifiedBadge';
import { CommentBody } from '@/components/comments/CommentBody';
import { CommentMobileActionSheet, type CommentActionItem } from '@/components/comments/CommentMobileActionSheet';
import { CommentReactionPicker } from '@/components/comments/CommentReactionPicker';
import { IconDotsVertical } from '@/components/ui/Icons';
import type { ApiComment, CommentPatch } from '@/components/comments/comment-types';
import {
  COMMENT_REACTION_EMOJI,
  type CommentReactionTypeKey,
  isCommentReactionType,
} from '@/constants/comment-reactions';

const COMMENT_AVATAR_MAIN = 36;
const COMMENT_AVATAR_REPLY = 28;

function topReactionChips(summary: Record<string, number> | undefined, limit = 3) {
  if (!summary) return [];
  return Object.entries(summary)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

export function CommentRow({
  c,
  showReply,
  onReply,
  onDelete,
  onReport,
  onPatch,
  onHide,
  depth = 0,
  videoId = '',
  viewerUserId,
  isSignedIn,
}: {
  c: ApiComment;
  showReply: boolean;
  onReply?: (body: string, parentId: string) => void;
  onDelete?: (comment: ApiComment) => void;
  onReport?: (id: string) => void;
  onPatch: (id: string, patch: CommentPatch) => void;
  onHide?: (id: string) => void;
  depth?: number;
  /** Performance / video id for share links */
  videoId?: string;
  viewerUserId: string | null;
  isSignedIn: boolean;
}) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [liked, setLiked] = useState(!!c.likedByMe);
  const [likeCount, setLikeCount] = useState(c.likeCount ?? 0);
  const [myReaction, setMyReaction] = useState<string | null>(c.myReaction ?? null);
  const [reactionSummary, setReactionSummary] = useState<Record<string, number>>(c.reactionSummary ?? {});
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const replyInputRef = useRef<HTMLInputElement>(null);
  const menuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pickerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pickerFiredRef = useRef(false);

  useEffect(() => {
    setLiked(!!c.likedByMe);
    setLikeCount(c.likeCount ?? 0);
    setMyReaction(c.myReaction ?? null);
    setReactionSummary(c.reactionSummary ?? {});
  }, [c.id, c.likedByMe, c.likeCount, c.myReaction, c.reactionSummary]);

  useEffect(() => {
    if (showReplyInput) replyInputRef.current?.focus();
  }, [showReplyInput]);

  const clearMenuTimer = useCallback(() => {
    if (menuTimerRef.current) {
      clearTimeout(menuTimerRef.current);
      menuTimerRef.current = null;
    }
  }, []);

  const clearPickerTimer = useCallback(() => {
    if (pickerTimerRef.current) {
      clearTimeout(pickerTimerRef.current);
      pickerTimerRef.current = null;
    }
  }, []);

  const applyLikeResponse = useCallback(
    (data: {
      liked?: boolean;
      likeCount?: number;
      myReaction?: string | null;
      reactionSummary?: Record<string, number>;
    }) => {
      if (typeof data.likeCount === 'number') setLikeCount(data.likeCount);
      if (data.myReaction !== undefined) setMyReaction(data.myReaction);
      if (data.reactionSummary) setReactionSummary(data.reactionSummary);
      if (data.liked !== undefined) setLiked(!!data.liked);
      onPatch(c.id, {
        likeCount: data.likeCount,
        myReaction: data.myReaction ?? null,
        reactionSummary: data.reactionSummary,
        likedByMe: data.liked,
      });
    },
    [c.id, onPatch]
  );

  const handleQuickLike = async () => {
    try {
      const res = await fetch(`/api/comments/${encodeURIComponent(c.id)}/like`, { method: 'POST' });
      const data = await res.json();
      if (res.status === 401) {
        const from =
          typeof window !== 'undefined' ? encodeURIComponent(window.location.pathname || '/') : '/';
        window.location.href = `/login?from=${from}`;
        return;
      }
      if (data.ok) applyLikeResponse(data);
    } catch {
      /* noop */
    }
  };

  const handleSetReaction = async (reaction: CommentReactionTypeKey) => {
    try {
      const res = await fetch(`/api/comments/${encodeURIComponent(c.id)}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction }),
      });
      const data = await res.json();
      if (res.status === 401) {
        const from =
          typeof window !== 'undefined' ? encodeURIComponent(window.location.pathname || '/') : '/';
        window.location.href = `/login?from=${from}`;
        return;
      }
      if (data.ok) applyLikeResponse(data);
    } catch {
      /* noop */
    }
  };

  const onReactPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    pickerFiredRef.current = false;
    pickerTimerRef.current = setTimeout(() => {
      pickerTimerRef.current = null;
      pickerFiredRef.current = true;
      setPickerOpen(true);
    }, 480);
  };

  const onReactPointerUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    clearPickerTimer();
    if (!pickerFiredRef.current) void handleQuickLike();
    pickerFiredRef.current = false;
  };

  const onReactPointerCancel = (e: React.PointerEvent) => {
    e.stopPropagation();
    clearPickerTimer();
    pickerFiredRef.current = false;
  };

  const onContentPointerDown = () => {
    if (c.isDeleted) return;
    menuTimerRef.current = setTimeout(() => {
      menuTimerRef.current = null;
      setMenuOpen(true);
    }, 520);
  };

  const onContentPointerUp = () => clearMenuTimer();
  const onContentPointerLeave = () => clearMenuTimer();

  const displayBody = c.isDeleted ? 'Comment deleted' : c.body;
  const bodyClass = c.isDeleted ? 'text-text-muted italic' : 'text-text-secondary';
  const isReply = depth > 0;
  const avatarSize = isReply ? COMMENT_AVATAR_REPLY : COMMENT_AVATAR_MAIN;
  const displayName = c.displayName ?? c.username;
  const isOwner = !!viewerUserId && c.userId === viewerUserId;
  const shareUrl =
    typeof window !== 'undefined'
      ? videoId
        ? `${window.location.origin}/video/${encodeURIComponent(videoId)}#comment-${encodeURIComponent(c.id)}`
        : `${window.location.href.split('#')[0]}#comment-${encodeURIComponent(c.id)}`
      : '';

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(c.isDeleted ? '' : c.body);
    } catch {
      /* noop */
    }
  };

  const shareComment = async () => {
    const text = c.isDeleted ? '' : c.body.slice(0, 280);
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Comment', text, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(`${text}\n${shareUrl}`);
      }
    } catch {
      try {
        await navigator.clipboard.writeText(shareUrl);
      } catch {
        /* noop */
      }
    }
  };

  const menuActions: CommentActionItem[] = [];
  if (!c.isDeleted) {
    if (showReply && onReply) {
      menuActions.push({
        id: 'reply',
        label: 'Reply',
        onClick: () => setShowReplyInput(true),
      });
    }
    menuActions.push({
      id: 'share',
      label: 'Share comment',
      onClick: () => void shareComment(),
    });
    menuActions.push({
      id: 'copy',
      label: 'Copy text',
      onClick: () => void copyText(),
    });
    if (onHide && !isOwner) {
      menuActions.push({
        id: 'hide',
        label: 'Hide comment',
        onClick: () => onHide(c.id),
      });
    }
    if (isSignedIn && onReport && !isOwner) {
      menuActions.push({
        id: 'report',
        label: 'Report comment',
        onClick: () => onReport(c.id),
      });
    }
    if (c.canDelete && onDelete) {
      menuActions.push({
        id: 'delete',
        label: 'Delete',
        danger: true,
        onClick: () => {
          if (typeof window !== 'undefined' && !window.confirm('Delete this comment?')) return;
          onDelete(c);
        },
      });
    }
  }

  const reactionEmoji =
    myReaction && isCommentReactionType(myReaction)
      ? COMMENT_REACTION_EMOJI[myReaction]
      : liked
        ? COMMENT_REACTION_EMOJI.LIKE
        : '👍';

  const chips = topReactionChips(reactionSummary);

  return (
    <>
      <CommentMobileActionSheet
        open={menuOpen && menuActions.length > 0}
        onClose={() => setMenuOpen(false)}
        title="Comment actions"
        subtitle={
          c.isDeleted
            ? undefined
            : `“${c.body.slice(0, 80)}${c.body.length > 80 ? '…' : ''}”`
        }
        actions={menuActions}
      />
      <CommentReactionPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(r) => void handleSetReaction(r)}
      />

      <article
        className="group/comment relative overflow-hidden rounded-[18px] p-3.5 pr-11 sm:p-[18px] sm:pr-12 touch-manipulation ring-1 ring-white/[0.06] transition-[box-shadow,ring-color] duration-200"
        style={{
          background: isReply
            ? 'linear-gradient(145deg, rgba(34,34,40,0.92) 0%, rgba(24,24,30,0.88) 100%)'
            : 'linear-gradient(145deg, rgba(32,32,38,0.94) 0%, rgba(22,22,28,0.9) 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: liked || myReaction ? '0 0 0 1px rgba(196,18,47,0.22), 0 12px 40px rgba(0,0,0,0.35)' : '0 8px 32px rgba(0,0,0,0.28)',
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          if (!c.isDeleted) setMenuOpen(true);
        }}
      >
        {!c.isDeleted && menuActions.length > 0 ? (
          <button
            type="button"
            className="absolute right-2 top-2 z-10 flex h-10 w-10 items-center justify-center rounded-xl text-white/50 transition-colors hover:bg-white/[0.1] hover:text-white active:scale-95"
            aria-label="Comment actions"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(true);
            }}
          >
            <IconDotsVertical className="h-5 w-5" />
          </button>
        ) : null}
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-[0.12]"
          style={{ background: 'radial-gradient(circle, rgba(196,18,47,0.9) 0%, transparent 70%)' }}
          aria-hidden
        />
        <div
          className="relative z-[1] flex gap-3"
          onPointerDown={c.isDeleted ? undefined : onContentPointerDown}
          onPointerUp={c.isDeleted ? undefined : onContentPointerUp}
          onPointerCancel={c.isDeleted ? undefined : onContentPointerLeave}
          onPointerLeave={c.isDeleted ? undefined : onContentPointerLeave}
        >
          <Link
            href={`/profile/${c.username}`}
            className="shrink-0"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div
              className="rounded-full overflow-hidden bg-canvas-tertiary flex items-center justify-center"
              style={{ width: avatarSize, height: avatarSize }}
            >
              {c.avatarUrl ? (
                <img src={c.avatarUrl} alt="" className="avatar-image h-full w-full" />
              ) : (
                <span className="text-text-secondary text-[13px] font-semibold">{c.username.charAt(0)}</span>
              )}
            </div>
          </Link>
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <Link
                href={`/profile/${c.username}`}
                className="font-semibold text-[15px] text-text-primary hover:text-accent transition-colors truncate min-w-0 leading-tight"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {displayName}
              </Link>
              <span className="text-[12px] text-text-muted truncate max-w-[140px]">@{c.username}</span>
              {c.isCreator && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent/20 text-accent">Creator</span>
              )}
              {c.parentUsername && (
                <span className="text-[12px] text-text-muted">
                  → <span className="text-text-secondary">@{c.parentUsername}</span>
                </span>
              )}
              <VerifiedBadge verified={!!c.verified} verificationLevel={c.verificationLevel ?? undefined} size="sm" />
              {c.country && (
                <span className="text-[15px] shrink-0" title={c.country}>
                  {c.country.length === 2 ? getFlagEmoji(c.country) : c.country}
                </span>
              )}
              <span className="text-[12px] text-text-muted/90 shrink-0 ml-auto">{c.timestamp}</span>
            </div>
            <div
              className={`mt-2.5 text-[16px] leading-[1.45] break-words overflow-hidden select-text ${bodyClass}`}
              style={{ WebkitUserSelect: 'text', userSelect: 'text' }}
            >
              {c.isDeleted ? displayBody : <CommentBody text={c.body} />}
            </div>
          </div>
        </div>

        {!c.isDeleted && (
          <div className="mt-3 flex flex-wrap items-center gap-2 pl-[52px] sm:pl-[52px]">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onPointerDown={onReactPointerDown}
                onPointerUp={onReactPointerUp}
                onPointerCancel={onReactPointerCancel}
                aria-label="React to comment. Tap to toggle like. Press and hold to open reaction picker."
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[13px] font-medium transition-all duration-150 min-h-[40px] border active:scale-[0.97] ${
                  liked || myReaction
                    ? 'text-accent border-accent/35 bg-accent/[0.12] shadow-[0_0_20px_rgba(196,18,47,0.15)]'
                    : 'text-text-muted border-white/[0.1] hover:border-white/[0.16] hover:text-accent bg-white/[0.04]'
                }`}
              >
                <span className="text-[18px] leading-none" aria-hidden>
                  {reactionEmoji}
                </span>
                {likeCount > 0 && <span className="tabular-nums text-white/90">{likeCount}</span>}
              </button>
              {chips.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 text-[12px] text-white/55">
                  {chips.map(([k, n]) => (
                    <span key={k} className="rounded-full bg-white/[0.06] px-2 py-0.5 tabular-nums">
                      {isCommentReactionType(k) ? COMMENT_REACTION_EMOJI[k] : '·'} {n}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              {showReply && onReply && (
                <button
                  type="button"
                  onClick={() => setShowReplyInput((v) => !v)}
                  className="min-h-9 rounded-lg px-3 font-medium text-white/55 transition-colors hover:bg-white/[0.06] hover:text-accent"
                >
                  Reply
                </button>
              )}
            </div>
          </div>
        )}

        {!c.isDeleted && showReplyInput && onReply && (
          <form
            className="mt-3 pl-[52px] flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const v = replyInputRef.current?.value?.trim();
              if (v) {
                onReply(v, c.id);
                setShowReplyInput(false);
                replyInputRef.current!.value = '';
              }
            }}
          >
            <input
              ref={replyInputRef}
              type="text"
              placeholder={`Reply to @${c.username}...`}
              className="flex-1 h-[44px] px-3.5 rounded-[12px] border border-white/[0.1] text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/25 text-[16px]"
              style={{ background: 'linear-gradient(180deg, #3a3a3e 0%, #323236 100%)' }}
            />
            <button type="submit" className="px-4 h-[44px] rounded-[12px] bg-accent text-white text-[14px] font-medium hover:opacity-95">
              Reply
            </button>
            <button
              type="button"
              onClick={() => setShowReplyInput(false)}
              className="px-3 h-[44px] rounded-[12px] text-text-muted hover:text-text-primary text-[13px]"
            >
              Cancel
            </button>
          </form>
        )}
      </article>
    </>
  );
}
