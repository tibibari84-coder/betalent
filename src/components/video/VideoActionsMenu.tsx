'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { IconDotsVertical } from '@/components/ui/Icons';
import { useViewer } from '@/contexts/ViewerContext';
import { logVideoAction } from '@/lib/video-actions-log';
import { showBetalentToast } from '@/lib/betalent-toast';
import DeleteVideoConfirmModal from '@/components/video/DeleteVideoConfirmModal';
import ReportVideoModal from '@/components/video/ReportVideoModal';
import VideoActionsSheet from '@/components/video/VideoActionsSheet';

export type VideoActionsMenuProps = {
  videoId: string;
  title: string;
  creatorId: string;
  /** Optional `video.creator.id` from feed/detail — if `creatorId` were ever wrong client-side, this still matches the profile row. */
  creatorProfileId?: string;
  visibility?: import('@prisma/client').VideoVisibility;
  commentPermission?: 'EVERYONE' | 'FOLLOWERS' | 'FOLLOWING' | 'OFF';
  onRemoved?: (videoId: string) => void;
  compact?: boolean;
  className?: string;
};

function toastMessage(msg: string) {
  if (typeof document === 'undefined') return;
  const el = document.createElement('div');
  el.setAttribute('role', 'status');
  el.className =
    'fixed bottom-[max(5.5rem,env(safe-area-inset-bottom,0px)+4.5rem)] left-1/2 z-[300] max-w-[min(100%,20rem)] -translate-x-1/2 px-4 py-2.5 text-center text-[13px] font-medium text-white shadow-lg border border-white/10 rounded-full';
  el.style.background = 'rgba(18,22,31,0.96)';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

function useMobileSheetLayout() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const apply = () => setMobile(mq.matches);
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, []);
  return mobile;
}

const sheetBtn =
  'mb-1.5 flex w-full min-h-[48px] items-center rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-left text-[15px] font-medium text-white/90 transition-transform active:scale-[0.98] disabled:opacity-45';
const sheetBtnDanger =
  'mb-1.5 flex w-full min-h-[48px] items-center rounded-xl border border-red-500/35 bg-red-500/[0.12] px-4 py-3 text-left text-[15px] font-medium text-red-200 transition-transform active:scale-[0.98]';

export default function VideoActionsMenu({
  videoId,
  title,
  creatorId,
  creatorProfileId,
  visibility = 'PUBLIC',
  commentPermission,
  onRemoved,
  compact = false,
  className = '',
}: VideoActionsMenuProps) {
  const router = useRouter();
  const { viewer, loading: viewerLoading, refresh } = useViewer();
  const useSheet = useMobileSheetLayout();
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [localVisibility, setLocalVisibility] = useState(visibility);
  const [localCommentPermission, setLocalCommentPermission] = useState<
    'EVERYONE' | 'FOLLOWERS' | 'FOLLOWING' | 'OFF' | null
  >(commentPermission ?? null);
  const [visBusy, setVisBusy] = useState(false);

  const viewerId = viewer?.id;
  const creatorIdsMatch =
    viewerId != null &&
    (viewerId === creatorId ||
      (creatorProfileId != null && viewerId === creatorProfileId));
  /** While session is loading, do not treat the user as guest or stranger — avoids missing Delete / Follow-self on own videos. */
  const authPending = viewerLoading;
  const isOwner = !authPending && creatorIdsMatch;
  const shareUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/video/${videoId}` : '';

  const canCopyPublicLink = localVisibility === 'PUBLIC' || isOwner;

  const updateMenuPosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const mw = Math.min(280, window.innerWidth - 16);
    let left = r.right - mw;
    if (left < 8) left = 8;
    if (left + mw > window.innerWidth - 8) left = window.innerWidth - mw - 8;
    setMenuPos({ top: r.bottom + 6, left, width: mw });
  }, []);

  useEffect(() => {
    setLocalVisibility(visibility);
  }, [visibility]);

  useEffect(() => {
    setLocalCommentPermission(commentPermission ?? null);
  }, [commentPermission]);

  useEffect(() => {
    if (!open || !isOwner || localCommentPermission) return;
    let cancelled = false;
    fetch(`/api/videos/${videoId}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        const p = data?.video?.commentPermission as
          | 'EVERYONE'
          | 'FOLLOWERS'
          | 'FOLLOWING'
          | 'OFF'
          | undefined;
        if (p) setLocalCommentPermission(p);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, isOwner, localCommentPermission, videoId]);

  useEffect(() => {
    if (!open || useSheet) return;
    updateMenuPosition();
    const onScroll = () => updateMenuPosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, useSheet, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (!open || useSheet) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, useSheet]);

  const closeMenu = () => setOpen(false);

  const copyLink = async () => {
    if (!canCopyPublicLink || !shareUrl) {
      toastMessage('Link unavailable');
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      toastMessage('Link copied');
    } catch {
      toastMessage('Could not copy');
    }
    closeMenu();
  };

  const shareVideo = async () => {
    if (!shareUrl) return;
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({
          title: title || 'BETALENT',
          text: 'Watch this performance on BETALENT',
          url: shareUrl,
        });
        toastMessage('Shared');
        closeMenu();
        return;
      }
      await copyLink();
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') {
        closeMenu();
        return;
      }
      try {
        await navigator.clipboard.writeText(shareUrl);
        toastMessage('Link copied');
      } catch {
        toastMessage('Could not share');
      }
      closeMenu();
    }
  };

  const toggleVisibility = async () => {
    const next = localVisibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC';
    setVisBusy(true);
    try {
      const res = await fetch(`/api/videos/${videoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ visibility: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toastMessage(typeof data?.message === 'string' ? data.message : 'Could not update');
        return;
      }
      setLocalVisibility(next);
      toastMessage(next === 'PRIVATE' ? 'Video is now private' : 'Video is now public');
      await refresh();
    } catch {
      toastMessage('Network error');
    } finally {
      setVisBusy(false);
      closeMenu();
    }
  };

  const setCommentPermission = async (next: 'EVERYONE' | 'FOLLOWERS' | 'FOLLOWING' | 'OFF') => {
    setVisBusy(true);
    try {
      const res = await fetch(`/api/videos/${videoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ commentPermission: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toastMessage(typeof data?.message === 'string' ? data.message : 'Could not update');
        return;
      }
      setLocalCommentPermission(next);
      const labels: Record<'EVERYONE' | 'FOLLOWERS' | 'FOLLOWING' | 'OFF', string> = {
        EVERYONE: 'Comments: everyone',
        FOLLOWERS: 'Comments: followers',
        FOLLOWING: 'Comments: people you follow',
        OFF: 'Comments: off',
      };
      toastMessage(labels[next]);
      await refresh();
    } catch {
      toastMessage('Network error');
    } finally {
      setVisBusy(false);
      closeMenu();
    }
  };

  const confirmDelete = async () => {
    logVideoAction('video_delete_started', { videoId });
    setDeleting(true);
    setDeleteOpen(false);
    closeMenu();
    try {
      const res = await fetch(`/api/videos/${videoId}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        logVideoAction('video_delete_failed', {
          videoId,
          status: res.status,
          message: typeof data?.message === 'string' ? data.message : undefined,
        });
        showBetalentToast({
          message: typeof data?.message === 'string' ? data.message : 'Could not delete video',
          variant: 'error',
          durationMs: 4000,
        });
        void router.refresh();
        return;
      }
      logVideoAction('video_deleted', { videoId });
      onRemoved?.(videoId);
      await refresh();
      router.refresh();
    } catch {
      logVideoAction('video_delete_failed', { videoId, error: 'network' });
      showBetalentToast({ message: 'Network error — try again', variant: 'error', durationMs: 4000 });
      void router.refresh();
    } finally {
      setDeleting(false);
    }
  };

  const showReport = Boolean(!authPending && viewerId && !creatorIdsMatch);
  const showOwnerActions = isOwner;

  const ownerCommentBlock = (layout: 'sheet' | 'dropdown') => {
    if (!showOwnerActions || !localCommentPermission) return null;
    if (layout === 'sheet') {
      return (
        <div className="mb-3 rounded-xl border border-white/[0.08] bg-white/[0.04] p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">
            Comment permission
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['EVERYONE', 'Everyone'],
                ['FOLLOWERS', 'Followers'],
                ['FOLLOWING', 'Following'],
                ['OFF', 'Off'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                disabled={visBusy}
                onClick={() => void setCommentPermission(value)}
                className={`min-h-[44px] rounded-lg px-2 py-2 text-left text-[13px] transition-colors disabled:opacity-50 ${
                  localCommentPermission === value
                    ? 'border border-accent/40 bg-accent/20 text-white'
                    : 'border border-white/[0.08] bg-white/[0.04] text-white/85'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      );
    }
    return (
      <div className="border-t border-white/[0.06] px-4 pt-3 pb-2">
        <p className="mb-2 text-[12px] uppercase tracking-wide text-white/60">Comment permission</p>
        <div className="grid grid-cols-2 gap-1.5">
          {(
            [
              ['EVERYONE', 'Everyone'],
              ['FOLLOWERS', 'Followers'],
              ['FOLLOWING', 'Following'],
              ['OFF', 'Off'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="menuitemradio"
              aria-checked={localCommentPermission === value}
              disabled={visBusy}
              onClick={() => void setCommentPermission(value)}
              className={`rounded-lg px-2.5 py-2 text-left text-[12px] transition-colors disabled:opacity-50 ${
                localCommentPermission === value
                  ? 'border border-accent/40 bg-accent/20 text-white'
                  : 'border border-white/[0.08] bg-white/[0.04] text-[#e2e8f0] hover:bg-white/[0.08]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const sheetBody = (
    <>
      {authPending && (
        <p className="mb-1 px-1 py-6 text-center text-[14px] text-white/55">Loading account…</p>
      )}
      {!authPending && !isOwner && (
        <>
          {showReport && (
            <button
              type="button"
              className={sheetBtn}
              onClick={() => {
                closeMenu();
                setReportOpen(true);
              }}
            >
              Report
            </button>
          )}
          <button
            type="button"
            className={sheetBtn + ' text-white/55'}
            onClick={() => {
              toastMessage('Not interested — personalization coming soon');
              closeMenu();
            }}
          >
            Not interested
          </button>
          <button type="button" className={sheetBtn} onClick={() => void shareVideo()}>
            Share
          </button>
          {canCopyPublicLink && (
            <button type="button" className={sheetBtn} onClick={() => void copyLink()}>
              Copy link
            </button>
          )}
        </>
      )}
      {showOwnerActions && (
        <>
          {canCopyPublicLink && (
            <button type="button" className={sheetBtn} onClick={() => void copyLink()}>
              Copy link
            </button>
          )}
          <button type="button" className={sheetBtn + ' text-white/45'} disabled aria-disabled>
            Edit (coming soon)
          </button>
          {ownerCommentBlock('sheet')}
          <button
            type="button"
            className={sheetBtn}
            disabled={visBusy}
            onClick={() => void toggleVisibility()}
          >
            {visBusy
              ? 'Updating…'
              : localVisibility === 'PRIVATE'
                ? 'Make public'
                : 'Make private'}
          </button>
          <button
            type="button"
            className={sheetBtnDanger}
            disabled={deleting}
            onClick={() => {
              if (deleting) return;
              closeMenu();
              setDeleteOpen(true);
            }}
          >
            Delete video
          </button>
        </>
      )}
    </>
  );

  const dropdownPortal =
    open && !useSheet && menuPos && typeof document !== 'undefined'
      ? createPortal(
          <>
            <div className="fixed inset-0 z-[150] bg-transparent" aria-hidden onClick={closeMenu} />
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              className="fixed z-[160] overflow-hidden rounded-[14px] border border-white/[0.12] py-1 shadow-2xl"
              style={{
                top: menuPos.top,
                left: menuPos.left,
                width: menuPos.width,
                background: 'rgba(12,14,20,0.97)',
                backdropFilter: 'blur(16px)',
              }}
            >
              {authPending && (
                <div className="px-4 py-3 text-[14px] text-white/55" role="presentation">
                  Loading account…
                </div>
              )}
              {!authPending && !isOwner && (
                <>
                  {showReport && (
                    <button
                      type="button"
                      role="menuitem"
                      className="w-full px-4 py-3 text-left text-[14px] text-[#f1f5f9] transition-colors hover:bg-white/[0.06]"
                      onClick={() => {
                        closeMenu();
                        setReportOpen(true);
                      }}
                    >
                      Report
                    </button>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    className="w-full px-4 py-3 text-left text-[14px] text-white/55 transition-colors hover:bg-white/[0.06]"
                    onClick={() => {
                      toastMessage('Not interested — personalization coming soon');
                      closeMenu();
                    }}
                  >
                    Not interested
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="w-full px-4 py-3 text-left text-[14px] text-[#f1f5f9] transition-colors hover:bg-white/[0.06]"
                    onClick={() => void shareVideo()}
                  >
                    Share
                  </button>
                  {canCopyPublicLink && (
                    <button
                      type="button"
                      role="menuitem"
                      className="w-full px-4 py-3 text-left text-[14px] text-[#f1f5f9] transition-colors hover:bg-white/[0.06]"
                      onClick={() => void copyLink()}
                    >
                      Copy link
                    </button>
                  )}
                </>
              )}
              {showOwnerActions && (
                <>
                  {canCopyPublicLink && (
                    <button
                      type="button"
                      role="menuitem"
                      className="w-full px-4 py-3 text-left text-[14px] text-[#f1f5f9] transition-colors hover:bg-white/[0.06]"
                      onClick={() => void copyLink()}
                    >
                      Copy link
                    </button>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    disabled
                    className="w-full cursor-not-allowed px-4 py-3 text-left text-[14px] text-white/35"
                  >
                    Edit (coming soon)
                  </button>
                  {ownerCommentBlock('dropdown')}
                  <button
                    type="button"
                    role="menuitem"
                    disabled={visBusy}
                    className="w-full px-4 py-3 text-left text-[14px] text-[#f1f5f9] transition-colors hover:bg-white/[0.06] disabled:opacity-50"
                    onClick={() => void toggleVisibility()}
                  >
                    {visBusy
                      ? 'Updating…'
                      : localVisibility === 'PRIVATE'
                        ? 'Make public'
                        : 'Make private'}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={deleting}
                    className="w-full px-4 py-3 text-left text-[14px] text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-45"
                    onClick={() => {
                      if (deleting) return;
                      closeMenu();
                      setDeleteOpen(true);
                    }}
                  >
                    Delete video
                  </button>
                </>
              )}
            </div>
          </>,
          document.body
        )
      : null;

  return (
    <div className={`relative z-30 ${className}`} onClick={(e) => e.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        className={`inline-flex touch-manipulation items-center justify-center rounded-full border border-white/20 bg-black/55 text-white/95 transition-colors hover:bg-white/15 active:scale-95 ${
          compact
            ? 'h-11 w-11 min-h-[44px] min-w-[44px] md:h-9 md:w-9 md:min-h-[36px] md:min-w-[36px]'
            : 'h-11 w-11 min-h-[44px] min-w-[44px]'
        }`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        <IconDotsVertical className={compact ? 'h-5 w-5 md:h-4 md:w-4' : 'h-5 w-5'} aria-hidden />
        <span className="sr-only">Video actions</span>
      </button>

      {open && useSheet && (
        <VideoActionsSheet open={open} onClose={closeMenu} title="Performance" subtitle="BeTalent">
          {sheetBody}
        </VideoActionsSheet>
      )}

      {dropdownPortal}

      <DeleteVideoConfirmModal
        open={deleteOpen}
        title={title}
        deleting={deleting}
        onClose={() => !deleting && setDeleteOpen(false)}
        onConfirm={() => void confirmDelete()}
      />
      <ReportVideoModal
        open={reportOpen}
        videoId={videoId}
        title={title}
        onClose={() => setReportOpen(false)}
        onSubmitted={() => toastMessage('Report submitted')}
      />
    </div>
  );
}
