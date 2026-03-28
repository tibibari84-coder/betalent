'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useViewer } from '@/contexts/ViewerContext';
import { IconComment, IconX, IconPaperAirplane } from '@/components/ui/Icons';
import Link from 'next/link';
import { CONTENT_REPORT_TYPE_LABELS, type ContentReportTypeKey } from '@/constants/content-report';
import { CommentRow } from '@/components/comments/CommentRow';
import type { CommentItem, ApiComment, CommentPatch } from '@/components/comments/comment-types';

export type { CommentItem };

type PostCommentUser = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  country: string | null;
  verified: boolean;
  verificationLevel: string | null;
};

function mapPostResponseToApiComment(
  c: {
    id: string;
    userId: string;
    body: string;
    isDeleted: boolean;
    likeCount: number;
    replyCount: number;
    createdAt: string;
    user: PostCommentUser;
  },
  videoCreatorId: string | null
): ApiComment {
  return {
    id: c.id,
    userId: c.userId,
    parentId: null,
    username: c.user.username,
    displayName: c.user.displayName ?? c.user.username,
    avatarUrl: c.user.avatarUrl ?? undefined,
    country: c.user.country ?? undefined,
    timestamp: 'now',
    body: c.body,
    isDeleted: c.isDeleted,
    likeCount: c.likeCount,
    replyCount: c.replyCount,
    verified: c.user.verified,
    verificationLevel: c.user.verificationLevel,
    isCreator: Boolean(videoCreatorId && videoCreatorId === c.userId),
    canDelete: true,
    createdAt: c.createdAt,
    likedByMe: false,
    myReaction: null,
    reactionSummary: {},
  };
}

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
  const { viewer } = useViewer();
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
    currentUserId: string | null;
    creatorId: string | null;
  }>({
    commentsCount: 0,
    commentPermission: 'EVERYONE',
    canComment: false,
    isSignedIn: false,
    currentUserId: null,
    creatorId: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [replyPages, setReplyPages] = useState<Record<string, { items: ApiComment[]; next: string | null; loading: boolean }>>({});
  const [reportId, setReportId] = useState<string | null>(null);
  const [reportInfo, setReportInfo] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());

  const selfFetch = Boolean(videoId);
  const hideStorageKey = videoId ? `bt_comment_hide_${videoId}` : null;

  useEffect(() => {
    if (!hideStorageKey || typeof window === 'undefined') return;
    try {
      const raw = sessionStorage.getItem(hideStorageKey);
      if (raw) setHiddenIds(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* noop */
    }
  }, [hideStorageKey]);

  const hideCommentLocal = useCallback(
    (id: string) => {
      setHiddenIds((prev) => {
        const n = new Set(prev);
        n.add(id);
        if (hideStorageKey && typeof window !== 'undefined') {
          try {
            sessionStorage.setItem(hideStorageKey, JSON.stringify(Array.from(n)));
          } catch {
            /* noop */
          }
        }
        return n;
      });
    },
    [hideStorageKey]
  );

  const patchComment = useCallback((id: string, patch: CommentPatch) => {
    setSelfList((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    setReplyPages((p) => {
      const next = { ...p };
      for (const k of Object.keys(p)) {
        const page = p[k];
        if (!page?.items?.some((r) => r.id === id)) continue;
        next[k] = {
          ...page,
          items: page.items.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        };
      }
      return next;
    });
  }, []);

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
          currentUserId: (data.currentUserId as string | null) ?? null,
          creatorId: (data.creatorId as string | null) ?? null,
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
    const trimmed = body.trim();
    const useOptimisticTopLevel = selfFetch && !parentId && viewer?.id && trimmed;

    const pendingId = useOptimisticTopLevel ? `pending-${Date.now()}` : null;
    if (useOptimisticTopLevel && pendingId) {
      const optimistic: ApiComment = {
        id: pendingId,
        userId: viewer.id,
        parentId: null,
        username: viewer.username,
        displayName: viewer.username,
        timestamp: 'now',
        body: trimmed,
        isDeleted: false,
        likeCount: 0,
        replyCount: 0,
        verified: false,
        verificationLevel: null,
        isCreator: meta.creatorId === viewer.id,
        canDelete: true,
        likedByMe: false,
        myReaction: null,
        reactionSummary: {},
      };
      setSelfList((prev) => [optimistic, ...prev]);
      setMeta((m) => {
        const next = { ...m, commentsCount: m.commentsCount + 1 };
        onCommentsCountChange?.(next.commentsCount);
        return next;
      });
    }

    try {
      const res = await fetch('/api/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, body, parentId: parentId ?? null }),
      });
      const data = await res.json();
      if (res.status === 401) {
        if (pendingId) {
          setSelfList((prev) => prev.filter((c) => c.id !== pendingId));
          setMeta((m) => {
            const next = { ...m, commentsCount: Math.max(0, m.commentsCount - 1) };
            onCommentsCountChange?.(next.commentsCount);
            return next;
          });
        }
        const from =
          typeof window !== 'undefined' ? encodeURIComponent(window.location.pathname || '/') : '/';
        window.location.href = `/login?from=${from}`;
        return;
      }
      if (!res.ok) {
        if (pendingId) {
          setSelfList((prev) => prev.filter((c) => c.id !== pendingId));
          setMeta((m) => {
            const next = { ...m, commentsCount: Math.max(0, m.commentsCount - 1) };
            onCommentsCountChange?.(next.commentsCount);
            return next;
          });
        }
        setLocalError(data.message ?? 'Could not post');
        return;
      }
      if (pendingId && data?.comment?.id && data?.comment?.userId) {
        const mapped = mapPostResponseToApiComment(data.comment, meta.creatorId);
        setSelfList((prev) => {
          const rest = prev.filter((c) => c.id !== pendingId);
          if (rest.some((c) => c.id === mapped.id)) return rest;
          return [mapped, ...rest];
        });
      } else {
        await loadTop();
      }
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

  const visibleList = list.filter((c) => !hiddenIds.has(c.id));

  return (
    <>
      <ReportCommentModal
        commentId={reportId}
        onClose={() => setReportId(null)}
        onDone={() => setReportInfo('Report submitted. Thank you.')}
      />
      <div
        className="fixed inset-0 z-40 backdrop-blur-md md:hidden"
        style={{ background: 'var(--bt-sheet-scrim)' }}
        onClick={onClose}
        aria-hidden
      />

      <aside
        className="fixed inset-x-0 z-50 flex h-[min(92dvh,920px)] w-full flex-col overflow-hidden rounded-t-[28px] border-t border-white/[0.1] transition-transform duration-220 ease-out md:inset-x-auto md:bottom-0 md:right-0 md:top-0 md:h-full md:w-[430px] md:rounded-none md:border-t-0"
        style={{
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 -8px 48px rgba(0,0,0,0.55), -8px 0 48px rgba(0,0,0,0.45)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(120% 80% at 50% -10%, rgba(196,18,47,0.14), transparent 55%), linear-gradient(180deg, rgba(16,16,20,0.98) 0%, rgba(10,10,12,0.99) 100%)',
          }}
          aria-hidden
        />
        <div
          className="relative z-[1] flex min-h-0 flex-1 flex-col"
          style={{ backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)' }}
        >
        <header className="flex shrink-0 flex-col border-b border-[rgba(255,255,255,0.08)] px-5 pb-3 pt-2 md:px-5 md:pt-3">
          <div className="mx-auto mb-2 h-1 w-10 shrink-0 rounded-full bg-white/20 md:hidden" aria-hidden />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-[18px] font-semibold text-text-primary">Comments</h2>
              <span
                className="px-2 py-0.5 rounded-full text-[12px] font-medium text-text-secondary"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >
                {totalCount}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] w-10 h-10 rounded-[10px] flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
              aria-label="Close"
            >
              <IconX className="w-5 h-5" />
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] font-medium uppercase tracking-[0.14em] text-white/35 md:text-left">
            Press · hold · reactions · actions
          </p>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-y-contain px-5 py-4 touch-pan-y md:px-5">
          {(localError || submitError) && (
            <div className="rounded-[10px] px-3 py-2 text-[13px] text-amber-200/90 bg-amber-500/10 border border-amber-500/20">{localError || submitError}</div>
          )}
          {reportInfo && (
            <div className="rounded-[10px] px-3 py-2 text-[13px] text-emerald-200/90 bg-emerald-500/10 border border-emerald-500/20">
              {reportInfo}
            </div>
          )}
          {loading && selfFetch ? (
            <ul className="space-y-4 py-2" aria-busy="true" aria-label="Loading comments">
              {[0, 1, 2].map((i) => (
                <li
                  key={i}
                  className="h-[112px] animate-pulse rounded-[18px] bg-gradient-to-br from-white/[0.07] to-white/[0.02] ring-1 ring-white/[0.06]"
                />
              ))}
            </ul>
          ) : visibleList.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-2 py-14 text-center">
              <div
                className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl ring-1 ring-white/[0.1]"
                style={{
                  background:
                    'linear-gradient(145deg, rgba(196,18,47,0.18) 0%, rgba(255,255,255,0.06) 100%)',
                }}
              >
                <IconComment className="h-8 w-8 text-white/50" />
              </div>
              <p className="text-[15px] font-semibold tracking-tight text-white/90">
                {commentsDisabled
                  ? 'Comments off'
                  : list.length > 0 && hiddenIds.size > 0
                    ? 'Nothing to show'
                    : 'Start the conversation'}
              </p>
              <p className="mt-2 max-w-[280px] text-[13px] leading-relaxed text-white/45">
                {commentsDisabled
                  ? 'This performance does not accept comments.'
                  : list.length > 0 && hiddenIds.size > 0
                    ? 'Comments you hid this session stay hidden until you open a new tab or clear site data.'
                    : 'Be the first voice in the room. Long-press a comment (or use ···), hold the reaction chip for the full picker.'}
              </p>
            </div>
          ) : (
            visibleList.map((c) => (
              <div key={c.id} className="space-y-3 pb-[2px]">
                <CommentRow
                  c={c}
                  videoId={videoId ?? ''}
                  viewerUserId={selfFetch ? meta.currentUserId : null}
                  isSignedIn={isSignedIn}
                  showReply={showComposer}
                  onReply={submitComment}
                  onDelete={deleteComment}
                  onReport={isSignedIn ? (id) => setReportId(id) : undefined}
                  onPatch={patchComment}
                  onHide={hideCommentLocal}
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
                        className="min-h-9 rounded-lg px-2 text-[13px] font-semibold text-accent transition-colors hover:bg-white/[0.05]"
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
                        {(replyPages[c.id]?.items ?? [])
                          .filter((r) => !hiddenIds.has(r.id))
                          .map((r) => (
                            <CommentRow
                              key={r.id}
                              c={{ ...r, parentUsername: c.username }}
                              videoId={videoId ?? ''}
                              viewerUserId={selfFetch ? meta.currentUserId : null}
                              isSignedIn={isSignedIn}
                              showReply={false}
                              onReply={submitComment}
                              onDelete={deleteComment}
                              onReport={isSignedIn ? (id) => setReportId(id) : undefined}
                              onPatch={patchComment}
                              onHide={hideCommentLocal}
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
            className="sticky bottom-0 flex shrink-0 items-center gap-2 border-t border-white/[0.1] px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_40px_rgba(0,0,0,0.35)] md:px-5"
            style={{
              background: 'linear-gradient(180deg, rgba(20,20,24,0.96) 0%, rgba(12,12,14,0.98) 100%)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
            }}
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
              placeholder="Add a thoughtful comment…"
              disabled={busy}
              className="flex-1 h-[52px] px-4 rounded-[18px] border border-white/[0.09] text-[15px] text-zinc-100 placeholder:text-zinc-500/90 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-white/[0.16] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(180deg, rgba(48,48,52,0.95) 0%, rgba(34,34,38,0.98) 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
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
          <div className="shrink-0 border-t border-white/[0.1] px-4 py-3 md:px-5" style={{ background: 'rgba(12,12,14,0.95)' }}>
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
        </div>
      </aside>
    </>
  );
}
