'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { IconComment, IconHeart, IconX, IconPaperAirplane } from '@/components/ui/Icons';
import Link from 'next/link';
import { getFlagEmoji } from '@/lib/countries';
import VerifiedBadge from '@/components/shared/VerifiedBadge';
import { CommentBody } from '@/components/comments/CommentBody';
import { CONTENT_REPORT_TYPE_LABELS, type ContentReportTypeKey } from '@/constants/content-report';

export interface CommentItem {
  id: string;
  username: string;
  avatarUrl?: string;
  country?: string;
  timestamp: string;
  body: string;
  likeCount?: number;
  replyCount?: number;
  verified?: boolean;
  verificationLevel?: string | null;
  parentUsername?: string;
  replies?: CommentItem[];
  isDeleted?: boolean;
  canDelete?: boolean;
  isCreator?: boolean;
  likedByMe?: boolean;
  userId?: string;
}

type ApiComment = CommentItem & {
  createdAt?: string;
  parentId?: string | null;
};

interface CommentsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  /** When set, loads comments from GET /api/comments (recommended). */
  videoId?: string;
  /** Legacy: controlled list. Ignored when videoId triggers self-fetch. */
  comments?: CommentItem[];
  commentsCount?: number;
  onSubmit?: (body: string, parentId?: string) => Promise<void> | void;
  onDelete?: (commentId: string) => void;
  canComment?: boolean;
  commentPermission?: 'EVERYONE' | 'FOLLOWERS' | 'FOLLOWING' | 'OFF';
  isSignedIn?: boolean;
  submitError?: string | null;
  isSubmitting?: boolean;
  onCommentsCountChange?: (count: number) => void;
}

const COMMENT_AVATAR_MAIN = 36;
const COMMENT_AVATAR_REPLY = 28;

function CommentRow({
  c,
  showReply,
  onReply,
  onDelete,
  onReport,
  depth = 0,
}: {
  c: ApiComment;
  showReply: boolean;
  onReply?: (body: string, parentId: string) => void;
  onDelete?: (comment: ApiComment) => void;
  onReport?: (id: string) => void;
  depth?: number;
}) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [liked, setLiked] = useState(!!c.likedByMe);
  const [likeCount, setLikeCount] = useState(c.likeCount ?? 0);
  const replyInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLiked(!!c.likedByMe);
    setLikeCount(c.likeCount ?? 0);
  }, [c.id, c.likedByMe, c.likeCount]);

  useEffect(() => {
    if (showReplyInput) replyInputRef.current?.focus();
  }, [showReplyInput]);

  const displayBody = c.isDeleted ? 'Comment deleted' : c.body;
  const bodyClass = c.isDeleted ? 'text-text-muted italic' : 'text-text-secondary';
  const isReply = depth > 0;
  const avatarSize = isReply ? COMMENT_AVATAR_REPLY : COMMENT_AVATAR_MAIN;

  const handleLike = async () => {
    const prevL = liked;
    const prevN = likeCount;
    setLiked(!prevL);
    setLikeCount((n) => Math.max(0, n + (prevL ? -1 : 1)));
    try {
      const res = await fetch(`/api/comments/${encodeURIComponent(c.id)}/like`, { method: 'POST' });
      const data = await res.json();
      if (res.status === 401) {
        const from =
          typeof window !== 'undefined' ? encodeURIComponent(window.location.pathname || '/') : '/';
        window.location.href = `/login?from=${from}`;
        return;
      }
      if (data.ok) {
        setLiked(data.liked);
        setLikeCount(data.likeCount);
      } else {
        setLiked(prevL);
        setLikeCount(prevN);
      }
    } catch {
      setLiked(prevL);
      setLikeCount(prevN);
    }
  };

  return (
    <article
      className="rounded-[16px] p-4 sm:p-[18px]"
      style={{
        background: isReply ? 'rgba(31,31,34,0.74)' : 'rgba(26,26,30,0.78)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex gap-3.5">
        <Link href={`/profile/${c.username}`} className="shrink-0">
          <div
            className="rounded-full overflow-hidden bg-canvas-tertiary flex items-center justify-center"
            style={{ width: avatarSize, height: avatarSize }}
          >
            {c.avatarUrl ? (
              <img src={c.avatarUrl} alt={c.username} className="avatar-image h-full w-full" />
            ) : (
              <span className="text-text-secondary text-[13px] font-semibold">{c.username.charAt(0)}</span>
            )}
          </div>
        </Link>
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <Link href={`/profile/${c.username}`} className="font-semibold text-[16px] text-text-primary hover:text-accent transition-colors truncate min-w-0 leading-[1.25]">
              @{c.username}
            </Link>
            {c.isCreator && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent/20 text-accent">Creator</span>
            )}
            {c.parentUsername && (
              <span className="text-[13px] text-text-muted">
                → <span className="text-text-secondary">@{c.parentUsername}</span>
              </span>
            )}
            <VerifiedBadge verified={!!c.verified} verificationLevel={c.verificationLevel ?? undefined} size="sm" />
            {c.country && (
              <span className="text-[16px] shrink-0" title={c.country}>
                {c.country.length === 2 ? getFlagEmoji(c.country) : c.country}
              </span>
            )}
            <span className="text-[13px] text-text-muted/90 shrink-0">{c.timestamp}</span>
          </div>
          <div className={`mt-[14px] text-[18px] leading-[1.5] break-words overflow-hidden ${bodyClass}`}>
            {c.isDeleted ? displayBody : <CommentBody text={c.body} />}
          </div>
          {!c.isDeleted && (
            <div className="mt-3.5 flex flex-wrap items-center gap-3 text-[13px] leading-none">
              {showReply && onReply && (
                <button
                  type="button"
                  onClick={() => setShowReplyInput((v) => !v)}
                  className="text-text-muted hover:text-accent transition-colors min-h-8 px-1"
                >
                  Reply
                </button>
              )}
              <button
                type="button"
                onClick={handleLike}
                className={`flex items-center gap-1 transition-colors min-h-8 px-1 ${liked ? 'text-accent' : 'text-text-muted hover:text-accent'}`}
              >
                <IconHeart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
                {likeCount > 0 && <span>{likeCount}</span>}
              </button>
              {onReport && (
                <button type="button" onClick={() => onReport(c.id)} className="text-text-muted hover:text-text-secondary transition-colors min-h-8 px-1">
                  Report
                </button>
              )}
              {c.canDelete && onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined' && !window.confirm('Delete this comment?')) return;
                    setDeleting(true);
                    onDelete(c);
                  }}
                  disabled={deleting}
                  className="text-text-muted hover:text-red-400 transition-colors min-h-8 px-1"
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              )}
            </div>
          )}
          {showReplyInput && onReply && (
            <form
              className="mt-3.5 flex gap-2.5"
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
              <button type="button" onClick={() => setShowReplyInput(false)} className="px-3 h-[44px] rounded-[12px] text-text-muted hover:text-text-primary text-[13px]">
                Cancel
              </button>
            </form>
          )}
        </div>
      </div>
    </article>
  );
}

function ReportCommentModal({
  commentId,
  onClose,
  onDone,
}: {
  commentId: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reportType, setReportType] = useState<ContentReportTypeKey>('INAPPROPRIATE');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!commentId) return null;

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/comments/${encodeURIComponent(commentId)}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportType, details: details.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.message ?? 'Report failed');
        return;
      }
      onDone();
      onClose();
    } catch {
      setErr('Report failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl p-5 border border-white/10 bg-[#141416]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[16px] font-semibold text-white mb-3">Report comment</h3>
        <select
          value={reportType}
          onChange={(e) => setReportType(e.target.value as ContentReportTypeKey)}
          className="w-full h-10 rounded-lg bg-black/30 border border-white/10 text-[13px] text-white px-3 mb-2"
        >
          {(Object.keys(CONTENT_REPORT_TYPE_LABELS) as ContentReportTypeKey[]).map((k) => (
            <option key={k} value={k}>
              {CONTENT_REPORT_TYPE_LABELS[k]}
            </option>
          ))}
        </select>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Optional details"
          rows={3}
          className="w-full rounded-lg bg-black/30 border border-white/10 text-[13px] text-white px-3 py-2 mb-3"
        />
        {err && <p className="text-red-400 text-[13px] mb-2">{err}</p>}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-[13px] text-white/70 hover:bg-white/5">
            Cancel
          </button>
          <button type="button" disabled={busy} onClick={submit} className="px-4 py-2 rounded-lg bg-accent text-white text-[13px] disabled:opacity-50">
            {busy ? 'Sending…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CommentsPanel({
  isOpen,
  onClose,
  videoId,
  comments: legacyComments = [],
  commentsCount: legacyCount,
  onSubmit: parentSubmit,
  onDelete: parentDelete,
  canComment: canCommentProp,
  commentPermission: permProp,
  isSignedIn: signedInProp,
  submitError,
  isSubmitting: parentSubmitting,
  onCommentsCountChange,
}: CommentsPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [selfList, setSelfList] = useState<ApiComment[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [meta, setMeta] = useState<{
    commentsCount: number;
    commentPermission: CommentsPanelProps['commentPermission'];
    canComment: boolean;
    isSignedIn: boolean;
  }>({ commentsCount: 0, commentPermission: 'EVERYONE', canComment: false, isSignedIn: false });
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [replyPages, setReplyPages] = useState<Record<string, { items: ApiComment[]; next: string | null; loading: boolean }>>({});
  const [reportId, setReportId] = useState<string | null>(null);
  const [reportInfo, setReportInfo] = useState<string | null>(null);

  const selfFetch = Boolean(videoId);

  const mergeById = useCallback((prev: ApiComment[], next: ApiComment[]) => {
    const seen = new Set(prev.map((c) => c.id));
    const out = [...prev];
    for (const row of next) {
      if (!seen.has(row.id)) {
        seen.add(row.id);
        out.push(row);
      }
    }
    return out;
  }, []);

  const loadTop = useCallback(
    async (cursor?: string | null) => {
      if (!videoId) return;
      const isMore = !!cursor;
      if (isMore) setLoadingMore(true);
      else setLoading(true);
      try {
        const u = new URL('/api/comments', typeof window !== 'undefined' ? window.location.origin : '');
        u.searchParams.set('videoId', videoId);
        if (cursor) u.searchParams.set('cursor', cursor);
        const res = await fetch(u.toString());
        const data = await res.json();
        if (!data.ok) return;
        const rows = data.comments as ApiComment[];
        setNextCursor(data.nextCursor ?? null);
        setMeta({
          commentsCount: data.commentsCount ?? 0,
          commentPermission: data.commentPermission,
          canComment: data.canComment,
          isSignedIn: !!data.currentUserId,
        });
        onCommentsCountChange?.(data.commentsCount ?? 0);
        if (isMore) setSelfList((prev) => mergeById(prev, rows));
        else setSelfList(rows);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [videoId, onCommentsCountChange, mergeById]
  );

  useEffect(() => {
    if (isOpen && selfFetch && videoId) {
      setExpanded({});
      setReplyPages({});
      setReportInfo(null);
      loadTop();
    }
  }, [isOpen, selfFetch, videoId, loadTop]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setLocalError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    setLocalError(submitError ?? null);
  }, [submitError]);

  const loadReplies = async (commentId: string) => {
    setReplyPages((p) => ({
      ...p,
      [commentId]: { ...(p[commentId] ?? { items: [], next: null, loading: false }), loading: true },
    }));
    try {
      const u = new URL(`/api/comments/${encodeURIComponent(commentId)}/replies`, window.location.origin);
      const res = await fetch(u.toString());
      const data = await res.json();
      if (data.ok) {
        setReplyPages((p) => ({
          ...p,
          [commentId]: { items: data.replies ?? [], next: data.nextCursor ?? null, loading: false },
        }));
      }
    } finally {
      setReplyPages((p) => ({
        ...p,
        [commentId]: { ...(p[commentId] ?? { items: [], next: null, loading: false }), loading: false },
      }));
    }
  };

  const loadMoreReplies = async (commentId: string) => {
    const cur = replyPages[commentId];
    if (!cur?.next) return;
    const u = new URL(`/api/comments/${encodeURIComponent(commentId)}/replies`, window.location.origin);
    u.searchParams.set('cursor', cur.next);
    const res = await fetch(u.toString());
    const data = await res.json();
    if (data.ok) {
      setReplyPages((p) => ({
        ...p,
        [commentId]: {
          items: mergeById(p[commentId]?.items ?? [], data.replies ?? []),
          next: data.nextCursor ?? null,
          loading: false,
        },
      }));
    }
  };

  const submitComment = async (body: string, parentId?: string) => {
    if (parentSubmit) {
      await parentSubmit(body, parentId);
      return;
    }
    if (!videoId) return;
    setSubmitting(true);
    setLocalError(null);
    try {
      const res = await fetch('/api/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, body, parentId: parentId ?? null }),
      });
      const data = await res.json();
      if (res.status === 401) {
        const from =
          typeof window !== 'undefined' ? encodeURIComponent(window.location.pathname || '/') : '/';
        window.location.href = `/login?from=${from}`;
        return;
      }
      if (!res.ok) {
        setLocalError(data.message ?? 'Could not post');
        return;
      }
      await loadTop();
      if (parentId) {
        setExpanded((e) => ({ ...e, [parentId]: true }));
        await loadReplies(parentId);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const deleteComment = async (comment: ApiComment) => {
    const id = comment.id;
    const parentId = comment.parentId ?? null;
    if (parentDelete) {
      parentDelete(id);
      if (selfFetch) await loadTop();
      return;
    }
    if (selfFetch) {
      setSelfList((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, isDeleted: true, body: '[deleted]', canDelete: false }
            : parentId && c.id === parentId
              ? { ...c, replyCount: Math.max(0, (c.replyCount ?? 0) - 1) }
              : c
        )
      );
      if (parentId) {
        setReplyPages((p) => ({
          ...p,
          [parentId]: {
            ...(p[parentId] ?? { items: [], next: null, loading: false }),
            items: (p[parentId]?.items ?? []).map((r) =>
              r.id === id ? { ...r, isDeleted: true, body: '[deleted]', canDelete: false } : r
            ),
          },
        }));
      }
      setMeta((m) => {
        const next = { ...m, commentsCount: Math.max(0, m.commentsCount - 1) };
        onCommentsCountChange?.(next.commentsCount);
        return next;
      });
    }
    try {
      const res = await fetch(`/api/comment/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) await loadTop();
    } finally {
      /* noop */
    }
  };

  if (!isOpen) return null;

  const list = selfFetch ? selfList : legacyComments;
  const totalCount = selfFetch ? meta.commentsCount : typeof legacyCount === 'number' ? legacyCount : list.length;
  const commentsDisabled = (selfFetch ? meta.commentPermission : permProp) === 'OFF';
  const canComment = selfFetch ? meta.canComment : (canCommentProp ?? false);
  const isSignedIn = selfFetch ? meta.isSignedIn : (signedInProp ?? false);
  const commentPermission = selfFetch ? meta.commentPermission : permProp ?? 'EVERYONE';
  const busy = submitting || parentSubmitting;

  const showComposer = canComment && isSignedIn && !commentsDisabled;

  return (
    <>
      <ReportCommentModal
        commentId={reportId}
        onClose={() => setReportId(null)}
        onDone={() => setReportInfo('Report submitted. Thank you.')}
      />
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" onClick={onClose} aria-hidden />

      <aside
        className="fixed inset-x-0 z-50 flex flex-col w-full h-[min(92dvh,920px)] md:inset-x-auto md:w-[430px] md:h-full md:right-0 md:top-0 bottom-0 rounded-t-[24px] md:rounded-none transition-transform duration-220 ease-out"
        style={{
          background: 'rgba(18,18,22,0.96)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
        }}
      >
        <header className="flex items-center justify-between px-5 md:px-5 py-4 border-b border-[rgba(255,255,255,0.08)] shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-[18px] font-semibold text-text-primary">Comments</h2>
            <span className="px-2 py-0.5 rounded-full text-[12px] font-medium text-text-secondary" style={{ background: 'rgba(255,255,255,0.08)' }}>
              {totalCount}
            </span>
          </div>
          <button type="button" onClick={onClose} className="min-w-[44px] min-h-[44px] w-10 h-10 rounded-[10px] flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors" aria-label="Close">
            <IconX className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 md:px-5 py-4 space-y-4">
          {(localError || submitError) && (
            <div className="rounded-[10px] px-3 py-2 text-[13px] text-amber-200/90 bg-amber-500/10 border border-amber-500/20">{localError || submitError}</div>
          )}
          {reportInfo && (
            <div className="rounded-[10px] px-3 py-2 text-[13px] text-emerald-200/90 bg-emerald-500/10 border border-emerald-500/20">
              {reportInfo}
            </div>
          )}
          {loading && selfFetch ? (
            <p className="text-[13px] text-text-muted text-center py-8">Loading comments…</p>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <IconComment className="w-7 h-7 text-text-muted" />
              </div>
              <p className="text-[13px] text-text-secondary">
                {commentsDisabled ? 'Comments are disabled for this performance.' : 'No comments yet. Be the first!'}
              </p>
            </div>
          ) : (
            list.map((c) => (
              <div key={c.id} className="space-y-3 pb-[2px]">
                <CommentRow
                  c={c}
                  showReply={showComposer}
                  onReply={submitComment}
                  onDelete={deleteComment}
                  onReport={isSignedIn ? (id) => setReportId(id) : undefined}
                />
                {(c.replyCount ?? 0) > 0 && (
                  <div className="pl-3.5 relative">
                    <span
                      className="absolute left-[9px] top-0 bottom-0 w-px bg-white/[0.08]"
                      aria-hidden
                    />
                    {!expanded[c.id] ? (
                      <button
                        type="button"
                        className="text-[13px] text-accent font-medium min-h-8 px-1"
                        onClick={async () => {
                          setExpanded((e) => ({ ...e, [c.id]: true }));
                          await loadReplies(c.id);
                        }}
                      >
                        View replies ({c.replyCount ?? 0})
                      </button>
                    ) : (
                      <div className="space-y-2.5 mt-2">
                        {(replyPages[c.id]?.loading && !(replyPages[c.id]?.items?.length) && (
                          <p className="text-[12px] text-text-muted">Loading replies…</p>
                        ))}
                        {(replyPages[c.id]?.items ?? []).map((r) => (
                          <CommentRow
                            key={r.id}
                            c={{ ...r, parentUsername: c.username }}
                            showReply={false}
                            onReply={submitComment}
                            onDelete={deleteComment}
                            onReport={isSignedIn ? (id) => setReportId(id) : undefined}
                            depth={1}
                          />
                        ))}
                        {replyPages[c.id]?.next && (
                          <button type="button" className="text-[13px] text-accent min-h-8 px-1" onClick={() => loadMoreReplies(c.id)}>
                            Load more replies
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
          {selfFetch && nextCursor && (
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => loadTop(nextCursor)}
              className="w-full py-2 text-[13px] text-accent font-medium disabled:opacity-50"
            >
              {loadingMore ? 'Loading…' : 'Load more comments'}
            </button>
          )}
        </div>

        {showComposer ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const value = inputRef.current?.value?.trim();
              if (value) {
                void submitComment(value);
                inputRef.current!.value = '';
              }
            }}
            className="sticky bottom-0 flex items-center gap-2 px-4 md:px-5 pt-3 pb-[max(10px,env(safe-area-inset-bottom))] border-t border-[rgba(255,255,255,0.08)] shrink-0"
            style={{ background: 'rgba(18,18,22,0.96)', backdropFilter: 'blur(20px)' }}
          >
            <button
              type="button"
              className="w-11 h-[54px] rounded-[14px] flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-white/[0.06] transition-colors shrink-0"
              aria-label="Open media tools"
            >
              <IconComment className="w-5 h-5" />
            </button>
            <input
              ref={inputRef}
              type="text"
              placeholder="Add a comment..."
              disabled={busy}
              className="flex-1 h-[54px] px-4 rounded-[16px] border border-white/[0.1] text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-white/[0.14] text-[16px] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(180deg, #3a3a3e 0%, #323236 100%)' }}
            />
            <button
              type="button"
              className="w-10 h-[54px] rounded-[14px] flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-white/[0.06] transition-colors shrink-0"
              aria-label="Emoji"
            >
              <span className="text-[18px]" aria-hidden>
                😊
              </span>
            </button>
            <button type="submit" disabled={busy} className="w-12 h-[54px] rounded-[14px] flex items-center justify-center bg-accent text-white hover:bg-accent-hover transition-colors shrink-0 disabled:opacity-60 disabled:cursor-not-allowed" aria-label="Send">
              <IconPaperAirplane className="w-5 h-5" />
            </button>
          </form>
        ) : (
          <div className="px-4 md:px-5 py-3 border-t border-[rgba(255,255,255,0.08)] shrink-0">
            {!isSignedIn ? (
              <p className="text-[12px] text-text-muted text-center">
                <Link href={`/login?from=${typeof window !== 'undefined' ? encodeURIComponent(window.location.pathname) : '/'}`} className="text-accent hover:underline">
                  Sign in
                </Link>
                {' to leave a comment.'}
              </p>
            ) : (
              <p className="text-[12px] text-text-muted text-center">
                {commentsDisabled && 'Comments are disabled for this performance.'}
                {!commentsDisabled && commentPermission === 'FOLLOWERS' && 'Only followers of the creator can comment.'}
                {!commentsDisabled && commentPermission === 'FOLLOWING' && 'Only users the creator follows can comment.'}
              </p>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
