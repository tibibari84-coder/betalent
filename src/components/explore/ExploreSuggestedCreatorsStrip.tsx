'use client';

/**
 * Mobile / tablet discovery: horizontal suggested creators (logged-in only).
 * Desktop lg+ uses {@link SuggestedCreatorsPanel} in RightPanel to avoid duplicate API noise.
 */

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import FollowButton from '@/components/profile/FollowButton';
import { useViewer } from '@/contexts/ViewerContext';
import { CARD_BASE_STYLE } from '@/constants/card-design-system';
import type { CreatorRecommendationPayload } from '@/types/creator-recommendations';

function cardLabel(c: CreatorRecommendationPayload): string {
  if (c.recommendationReason) return c.recommendationReason;
  return 'Suggested performer';
}

export function ExploreSuggestedCreatorsStrip() {
  const { viewer, loading: viewerLoading } = useViewer();
  const [creators, setCreators] = useState<CreatorRecommendationPayload[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!viewer?.id) return;
    setLoading(true);
    try {
      const res = await fetch('/api/recommendations/creators?limit=8', { credentials: 'include' });
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
        /* ignore */
      }
    },
    [remove]
  );

  if (!viewerLoading && !viewer?.id) return null;

  return (
    <section className="min-w-0 lg:hidden" aria-label="Suggested creators">
      <div className="flex items-baseline justify-between gap-3 mb-2.5 min-w-0">
        <h2 className="font-display text-[clamp(1.1rem,1.4vw,1.35rem)] font-semibold truncate text-white/95">
          Creators for you
        </h2>
      </div>
      {viewerLoading || loading ? (
        <div className="flex gap-3 overflow-hidden pb-1">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="shrink-0 w-[200px] h-[280px] rounded-2xl animate-pulse bg-white/[0.06] border border-white/[0.06]"
            />
          ))}
        </div>
      ) : creators.length === 0 ? (
        <p className="text-[13px] text-white/50 py-1">No suggestions right now</p>
      ) : (
        <div className="relative min-w-0 -mx-[var(--layout-pad,16px)] tablet:mx-0">
          <div
            className="flex gap-3 overflow-x-auto overflow-y-hidden pb-2 scroll-smooth snap-x snap-mandatory scrollbar-thin px-[var(--layout-pad,16px)] tablet:px-0"
            style={{ scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
          >
            {creators.map((c) => (
              <div
                key={c.id}
                className="snap-start shrink-0 w-[220px] rounded-2xl overflow-hidden flex flex-col border border-white/[0.08]"
                style={CARD_BASE_STYLE}
              >
                <div className="p-3 flex flex-col flex-1 min-h-0">
                  <Link href={`/profile/${c.username}`} className="flex items-center gap-2.5 min-w-0">
                    {c.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.avatarUrl}
                        alt=""
                        className="h-11 w-11 rounded-full object-cover border border-white/10 shrink-0"
                      />
                    ) : (
                      <div className="h-11 w-11 rounded-full bg-white/10 flex items-center justify-center text-sm text-white/50 shrink-0">
                        {c.displayName.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-white">{c.displayName}</p>
                      <p className="truncate text-[12px] text-white/45">@{c.username}</p>
                    </div>
                  </Link>
                  <p className="mt-2 text-[11px] text-white/40 line-clamp-2 leading-snug min-h-[2.5rem]">
                    {cardLabel(c)}
                  </p>
                  <div className="mt-2 flex gap-1.5 flex-1 min-h-[72px]">
                    {c.previews.slice(0, 3).map((p) => (
                      <Link
                        key={p.videoId}
                        href={`/video/${p.videoId}`}
                        className="flex-1 min-w-0 rounded-lg overflow-hidden border border-white/10 bg-black/30 aspect-[9/16] max-h-[88px]"
                      >
                        {p.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[9px] text-white/30 p-0.5 text-center">
                            Clip
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-col gap-2">
                    <FollowButton
                      targetId={c.id}
                      initialFollowing={false}
                      variant="primary"
                      size="compact"
                      className="w-full justify-center"
                      stopPropagation
                      onToggle={(following) => {
                        if (following) remove(c.id);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => void dismiss(c.id)}
                      className="text-[12px] text-white/45 hover:text-white/75 py-1"
                    >
                      Not interested
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
