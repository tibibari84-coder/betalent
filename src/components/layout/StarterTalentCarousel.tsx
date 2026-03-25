'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { IconChevronRight } from '@/components/ui/Icons';
import { SIDEBAR_BASE_STYLE } from '@/constants/card-design-system';
import {
  TALENT_TIER_LABELS,
  TALENT_TIERS,
  TALENT_UPLOAD_LIMIT_SEC,
  TIER_REQUIREMENTS,
} from '@/constants/talent-ranking';
import type { CreatorTier } from '@prisma/client';

interface TalentRankData {
  creatorTier: CreatorTier;
  rankProgress: number;
  uploadLimitSec: number;
}

const TOTAL_SLIDES = 3;

function getNextTier(current: CreatorTier): CreatorTier | null {
  const idx = TALENT_TIERS.indexOf(current);
  return idx >= 0 && idx < TALENT_TIERS.length - 1 ? TALENT_TIERS[idx + 1]! : null;
}

function formatNextTierHint(tier: CreatorTier): string {
  const req = TIER_REQUIREMENTS[tier];
  if (!req) return 'Reach higher engagement and thresholds';
  const parts: string[] = [];
  if (req.minPerformances) parts.push(`${req.minPerformances} performances`);
  if (req.minTotalViews) parts.push(`${req.minTotalViews >= 1000 ? `${(req.minTotalViews / 1000).toFixed(0)}K` : req.minTotalViews} views`);
  if (req.minTotalVotes) parts.push(`${req.minTotalVotes >= 1000 ? `${(req.minTotalVotes / 1000).toFixed(0)}K` : req.minTotalVotes} votes`);
  if (req.minFollowers) parts.push(`${req.minFollowers} followers`);
  if (req.minViralPerformances) parts.push(`${req.minViralPerformances} viral performances`);
  if (req.minEngagementRatio) parts.push(`${(req.minEngagementRatio * 100).toFixed(0)}% engagement`);
  return parts.length ? parts.join(', ') : 'Reach higher engagement and thresholds';
}

export function StarterTalentCarousel() {
  const [current, setCurrent] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [talentRank, setTalentRank] = useState<TalentRankData | null>(null);
  const [rankLoading, setRankLoading] = useState(true);
  const dragStart = useRef(0);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchRank() {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        const data = (await res.json()) as {
          ok?: boolean;
          user?: { creatorTier?: CreatorTier; rankProgress?: number; uploadLimitSec?: number };
        };
        if (cancelled || !data?.ok || !data.user) return;
        const u = data.user;
        setTalentRank({
          creatorTier: (u.creatorTier as CreatorTier) ?? 'STARTER',
          rankProgress: typeof u.rankProgress === 'number' ? Math.max(0, Math.min(1, u.rankProgress)) : 0,
          uploadLimitSec: typeof u.uploadLimitSec === 'number' ? u.uploadLimitSec : 90,
        });
      } catch {
        if (!cancelled) setTalentRank(null);
      } finally {
        if (!cancelled) setRankLoading(false);
      }
    }
    void fetchRank();
    return () => {
      cancelled = true;
    };
  }, []);

  const goPrev = useCallback(() => {
    setCurrent((c) => Math.max(0, c - 1));
  }, []);

  const goNext = useCallback(() => {
    setCurrent((c) => Math.min(TOTAL_SLIDES - 1, c + 1));
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDraggingRef.current = true;
    setIsDragging(true);
    dragStart.current = e.clientX;
    setDragOffset(0);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    setDragOffset(e.clientX - dragStart.current);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const threshold = 40;
    setDragOffset((offset) => {
      if (offset > threshold) {
        goPrev();
      } else if (offset < -threshold) {
        goNext();
      }
      return 0;
    });
    setIsDragging(false);
  }, [goPrev, goNext]);

  const handlePointerLeave = useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setDragOffset((offset) => {
        const threshold = 40;
        if (offset > threshold) {
          goPrev();
        } else if (offset < -threshold) {
          goNext();
        }
        return 0;
      });
      setIsDragging(false);
    }
  }, [goPrev, goNext]);

  const translateX = isDragging ? dragOffset : 0;
  const baseOffset = -current * 100;

  return (
    <div
      className="mt-2 rounded-[16px] overflow-hidden min-w-0"
      style={SIDEBAR_BASE_STYLE}
    >
      <div
        className="relative overflow-hidden"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        style={{ touchAction: 'pan-y pinch-zoom' }}
      >
        <div
          className="flex ease-out"
          style={{
            transform: `translateX(calc(${baseOffset}% + ${translateX}px))`,
            transition: isDragging ? 'none' : 'transform 0.25s ease-out',
          }}
        >
          {/* Slide 1: Talent progress (real rankProgress from API) */}
          <div className="w-full shrink-0 px-4 xl:px-[18px] py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-white font-semibold text-[14px] leading-[1.2]">
                  {rankLoading
                    ? '—'
                    : (talentRank && TALENT_TIER_LABELS[talentRank.creatorTier]) ?? 'Starter Talent'}
                </p>
                <p className="mt-0.5 text-[#d7a7b2] text-[11px] leading-[1.25]">
                  Upload limit:{' '}
                  {rankLoading ? '—' : (talentRank?.uploadLimitSec ?? 90)} sec
                </p>
              </div>
              {!rankLoading && talentRank && (
                <div
                  className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
                  style={{
                    background: 'rgba(196,18,47,0.16)',
                    border: '1px solid rgba(196,18,47,0.24)',
                  }}
                >
                  {getNextTier(talentRank.creatorTier)
                    ? `${Math.round(talentRank.rankProgress * 100)}%`
                    : '100%'}
                </div>
              )}
            </div>
            {!rankLoading && talentRank && (
              <div className="mt-3">
                <div
                  className="h-2 w-full overflow-hidden rounded-full"
                  style={{ background: 'rgba(255,255,255,0.07)' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.round(talentRank.rankProgress * 100)}%`,
                      background:
                        'linear-gradient(90deg, #8f1028 0%, #c4122f 52%, #e33758 100%)',
                      boxShadow: '0 0 24px rgba(255, 60, 80, 0.12)',
                    }}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <p className="text-[#b2bac5] text-[11px] leading-[1.25]">
                    {getNextTier(talentRank.creatorTier)
                      ? `Progress to ${TALENT_TIER_LABELS[getNextTier(talentRank.creatorTier)!]}`
                      : 'Top tier reached'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Slide 2: Next milestone */}
          <div className="w-full shrink-0 px-4 xl:px-[18px] py-3.5">
            <p className="text-white font-semibold text-[14px] leading-[1.2]">
              {rankLoading || !talentRank
                ? 'Next: Rising Talent'
                : getNextTier(talentRank.creatorTier)
                  ? `Next: ${TALENT_TIER_LABELS[getNextTier(talentRank.creatorTier)!]}`
                  : 'Top tier'}
            </p>
            <p className="mt-1 text-[#d7a7b2] text-[11px] leading-[1.25]">
              {rankLoading || !talentRank
                ? 'Upload 5 approved performances'
                : getNextTier(talentRank.creatorTier)
                  ? formatNextTierHint(talentRank.creatorTier)
                  : "You've reached the highest tier"}
            </p>
            <p className="mt-2 text-[#B7BDC7] text-[12px] leading-[1.4]">
              Reach higher tiers for more visibility and perks.
            </p>
          </div>

          {/* Slide 3: Rewards / benefits (real tier-based content) */}
          <div className="w-full shrink-0 px-4 xl:px-[18px] py-3.5">
            <p className="text-white font-semibold text-[14px] leading-[1.2]">
              {rankLoading ? 'Talent benefits' : `${TALENT_TIER_LABELS[talentRank?.creatorTier ?? 'STARTER']} benefits`}
            </p>
            <p className="mt-1 text-[#d7a7b2] text-[11px] leading-[1.25]">
              {rankLoading
                ? 'Unlock rewards as you grow'
                : talentRank?.creatorTier === 'GLOBAL'
                  ? 'You have full platform benefits'
                  : 'Your current perks'}
            </p>
            <p className="mt-2 text-[#B7BDC7] text-[12px] leading-[1.4]">
              {rankLoading ? (
                'Higher tiers unlock longer uploads, featured placement, and leaderboard badges.'
              ) : talentRank ? (
                <>
                  <span className="block">
                    ✓ {TALENT_UPLOAD_LIMIT_SEC[talentRank.creatorTier]}s uploads
                    {talentRank.creatorTier === 'SPOTLIGHT' || talentRank.creatorTier === 'GLOBAL' ? ' (live-ready)' : ''}
                  </span>
                  {getNextTier(talentRank.creatorTier) ? (
                    <span className="mt-1 block text-[#9ca3af]">
                      Next: {TALENT_UPLOAD_LIMIT_SEC[getNextTier(talentRank.creatorTier)!] > TALENT_UPLOAD_LIMIT_SEC[talentRank.creatorTier]
                        ? `${TALENT_UPLOAD_LIMIT_SEC[getNextTier(talentRank.creatorTier)!]}s uploads, `
                        : ''}
                      featured placement, leaderboard badges
                    </span>
                  ) : null}
                </>
              ) : (
                'Higher tiers unlock longer uploads, featured placement, and leaderboard badges.'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation + pagination */}
      <div className="flex items-center justify-between gap-2 px-4 xl:px-[18px] py-2.5 border-t border-white/[0.06]">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goPrev}
            disabled={current === 0}
            aria-label="Previous slide"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
          >
            <IconChevronRight className="w-4 h-4 rotate-180" aria-hidden />
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={current === TOTAL_SLIDES - 1}
            aria-label="Next slide"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
          >
            <IconChevronRight className="w-4 h-4" aria-hidden />
          </button>
        </div>
        <p className="text-[#d7b4bc] text-[11px] leading-[1.25] shrink-0 tabular-nums">
          {current + 1} / {TOTAL_SLIDES}
        </p>
      </div>
    </div>
  );
}
