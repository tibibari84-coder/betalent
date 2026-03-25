'use client';

/**
 * Desktop / sidebar: real API-backed suggested creators (RightPanel and similar).
 * No placeholder creators; empty state is honest.
 */

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import FollowButton from '@/components/profile/FollowButton';
import { useViewer } from '@/contexts/ViewerContext';
import {
  IconUser,
} from '@/components/ui/Icons';
import { RIGHT_PANEL_CARD_STYLE } from '@/constants/card-design-system';
import type { CreatorRecommendationPayload } from '@/types/creator-recommendations';

const FLOATING_CARD_STYLE = RIGHT_PANEL_CARD_STYLE;

const SOFT_PILL_STYLE = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.06)',
} as const;

function rowSubtitle(c: CreatorRecommendationPayload): string {
  if (c.recommendationReason) return c.recommendationReason;
  if (c.talentType?.trim()) return c.talentType.trim();
  return 'Discover this creator';
}

export function SuggestedCreatorsPanel() {
  const { viewer, loading: viewerLoading } = useViewer();
  const [creators, setCreators] = useState<CreatorRecommendationPayload[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!viewer?.id) return;
    setLoading(true);
    try {
      const res = await fetch('/api/recommendations/creators?limit=6', { credentials: 'include' });
      const data = (await res.json()) as { ok?: boolean; creators?: CreatorRecommendationPayload[] };
      if (res.ok && data?.ok && Array.isArray(data.creators)) setCreators(data.creators);
      else setCreators([]);
    } catch {
      setCreators([]);
    } finally {
      setLoading(false);
    }
  }, [viewer?.id]);

  useEffect(() => {
    if (!viewer?.id) {
      setCreators([]);
      return;
    }
    void load();
  }, [viewer?.id, load]);

  const remove = useCallback((id: string) => {
    setCreators((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const dismiss = useCallback(
    async (id: string) => {
      try {
        const res = await fetch('/api/recommendations/creators/dismiss', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ creatorId: id, reason: 'NOT_INTERESTED' }),
        });
        const data = (await res.json()) as { ok?: boolean };
        if (res.ok && data?.ok) remove(id);
      } catch {
        /* keep row */
      }
    },
    [remove]
  );

  if (!viewerLoading && !viewer?.id) return null;

  return (
    <section
      className="w-full min-w-0 shrink-0 rounded-[16px] p-4 transition-all duration-200 ease-out opacity-[0.96]"
      style={FLOATING_CARD_STYLE}
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="flex min-w-0 items-center gap-2 font-display text-[13px] font-semibold leading-[1.25] text-white/90 tracking-[-0.01em]">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <IconUser className="h-[15px] w-[15px] text-[#F2B6C0]" aria-hidden />
          </span>
          <span className="truncate">Suggested creators</span>
        </h3>
      </div>

      {viewerLoading || loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2.5 rounded-[12px] px-2.5 py-2">
              <div className="h-9 w-9 shrink-0 rounded-full bg-white/10 animate-pulse" />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="h-3 w-20 rounded bg-white/10 animate-pulse" />
                <div className="h-2.5 w-24 rounded bg-white/5 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : creators.length === 0 ? (
        <p className="text-[13px] text-white/55 leading-relaxed py-1">No suggestions right now</p>
      ) : (
        <ul className="space-y-2">
          {creators.map((c) => (
            <li
              key={c.id}
              className="rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-2.5"
              style={SOFT_PILL_STYLE}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <Link href={`/profile/${c.username}`} className="shrink-0">
                  {c.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.avatarUrl}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover border border-white/10"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-sm text-white/50">
                      {c.displayName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/profile/${c.username}`} className="block min-w-0">
                    <p className="truncate text-[13px] font-medium text-white">{c.displayName}</p>
                    <p className="truncate text-[11px] text-white/45">@{c.username}</p>
                  </Link>
                  <p className="mt-0.5 text-[10px] text-white/40 line-clamp-2 leading-snug">{rowSubtitle(c)}</p>
                  {c.previews[0]?.thumbnailUrl && (
                    <Link
                      href={`/video/${c.previews[0].videoId}`}
                      className="mt-1.5 block relative w-full max-w-[140px] aspect-video rounded-lg overflow-hidden border border-white/10"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={c.previews[0].thumbnailUrl} alt="" className="h-full w-full object-cover" />
                    </Link>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <FollowButton
                      targetId={c.id}
                      initialFollowing={false}
                      variant="primary"
                      size="compact"
                      stopPropagation
                      onToggle={(following) => {
                        if (following) remove(c.id);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => void dismiss(c.id)}
                      className="text-[11px] text-white/45 hover:text-white/70 transition"
                    >
                      Not interested
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
