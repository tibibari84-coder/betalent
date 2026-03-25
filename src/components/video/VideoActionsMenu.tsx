'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { IconDotsVertical } from '@/components/ui/Icons';
import { useViewer } from '@/contexts/ViewerContext';
import DeleteVideoConfirmModal from '@/components/video/DeleteVideoConfirmModal';
import ReportVideoModal from '@/components/video/ReportVideoModal';

export type VideoActionsMenuProps = {
  videoId: string;
  title: string;
  creatorId: string;
  visibility?: 'PUBLIC' | 'PRIVATE';
  commentPermission?: 'EVERYONE' | 'FOLLOWERS' | 'FOLLOWING' | 'OFF';
  /** Called after successful delete so lists can update */
  onRemoved?: (videoId: string) => void;
  /** Smaller hit target for dense feed rail */
  compact?: boolean;
  className?: string;
};

function toastMessage(msg: string) {
  if (typeof document === 'undefined') return;
  const el = document.createElement('div');
  el.setAttribute('role', 'status');
  el.className =
    'fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] px-4 py-2.5 rounded-full text-[13px] font-medium text-white shadow-lg border border-white/10';
  el.style.background = 'rgba(18,22,31,0.95)';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

export default function VideoActionsMenu({
  videoId,
  title,
  creatorId,
  visibility = 'PUBLIC',
  commentPermission,
  onRemoved,
  compact = false,
  className = '',
}: VideoActionsMenuProps) {
  const router = useRouter();
  const { viewer, refresh } = useViewer();
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

  const isOwner = Boolean(viewer?.id && viewer.id === creatorId);
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
    if (!open) return;
    updateMenuPosition();
    const onScroll = () => updateMenuPosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

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
    setOpen(false);
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
      setOpen(false);
    }
  };

  const setCommentPermission = async (
    next: 'EVERYONE' | 'FOLLOWERS' | 'FOLLOWING' | 'OFF'
  ) => {
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
      setOpen(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/videos/${videoId}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toastMessage(typeof data?.message === 'string' ? data.message : 'Could not delete');
        return;
      }
      /* Close modals before refresh — avoids fixed overlay fighting re-renders (flicker / “vibration”). */
      setDeleteOpen(false);
      setOpen(false);
      onRemoved?.(videoId);
      await refresh();
      router.refresh();
    } catch {
      toastMessage('Network error');
    } finally {
      setDeleting(false);
    }
  };

  const showReport = Boolean(viewer?.id && !isOwner);
  const showOwnerActions = isOwner;

  const menuContent =
    open && menuPos && typeof document !== 'undefined'
      ? createPortal(
          <>
            <div className="fixed inset-0 z-[150] bg-transparent" aria-hidden onClick={() => setOpen(false)} />
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              className="fixed z-[160] rounded-[14px] border border-white/[0.12] py-1 shadow-2xl overflow-hidden"
              style={{
                top: menuPos.top,
                left: menuPos.left,
                width: menuPos.width,
                background: 'rgba(12,14,20,0.97)',
                backdropFilter: 'blur(16px)',
              }}
            >
              {canCopyPublicLink && (
                <button
                  type="button"
                  role="menuitem"
                  className="w-full text-left px-4 py-3 text-[14px] text-[#f1f5f9] hover:bg-white/[0.06] transition-colors"
                  onClick={() => void copyLink()}
                >
                  Copy link
                </button>
              )}
              {showReport && (
                <button
                  type="button"
                  role="menuitem"
                  className="w-full text-left px-4 py-3 text-[14px] text-[#f1f5f9] hover:bg-white/[0.06] transition-colors"
                  onClick={() => {
                    setOpen(false);
                    setReportOpen(true);
                  }}
                >
                  Report
                </button>
              )}
              {showOwnerActions && (
                <>
                  {localCommentPermission && (
                    <div className="px-4 pt-3 pb-2 border-t border-white/[0.06]">
                      <p className="text-[12px] text-white/60 mb-2 uppercase tracking-wide">
                        Comment permission
                      </p>
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
                            className={`px-2.5 py-2 rounded-lg text-[12px] text-left transition-colors disabled:opacity-50 ${
                              localCommentPermission === value
                                ? 'bg-accent/20 text-white border border-accent/40'
                                : 'bg-white/[0.04] text-[#e2e8f0] border border-white/[0.08] hover:bg-white/[0.08]'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    disabled={visBusy}
                    className="w-full text-left px-4 py-3 text-[14px] text-[#f1f5f9] hover:bg-white/[0.06] transition-colors disabled:opacity-50"
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
                    className="w-full text-left px-4 py-3 text-[14px] text-red-400 hover:bg-red-500/10 transition-colors"
                    onClick={() => {
                      setOpen(false);
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
        className={`inline-flex items-center justify-center rounded-full border border-white/15 bg-black/50 text-white/90 hover:bg-white/10 hover:text-white transition-colors ${
          compact ? 'w-8 h-8 min-w-[32px] min-h-[32px]' : 'w-9 h-9 min-w-[36px] min-h-[36px]'
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
        <IconDotsVertical className={compact ? 'w-4 h-4' : 'w-5 h-5'} aria-hidden />
        <span className="sr-only">Video actions</span>
      </button>
      {menuContent}
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
