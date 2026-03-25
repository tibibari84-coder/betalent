import Link from 'next/link';
import VideoCard from '@/components/video/VideoCard';
import { FeedEmptyState } from '@/components/feed/FeedEmptyState';
import { getFlagEmoji } from '@/lib/countries';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { filterVideoIdsForFeedViewer } from '@/lib/feed-profile-visibility';
import { getTrendingVideos } from '@/services/trending.service';
import { listChallenges, getChallengeLeaderboard } from '@/services/challenge.service';
import { CANONICAL_PUBLIC_VIDEO_WHERE } from '@/lib/video-moderation';
import { CHALLENGE_MAX_DURATION_SEC_DB_DEFAULT, getLiveChallengeRecordingCapSec } from '@/constants/recording-modes';
import { isDatabaseUnavailableError } from '@/lib/db-errors';
import type { ChallengeLeaderboardEntry } from '@/types/challenge';
import type { VideoVisibility } from '@prisma/client';
import { DEFAULT_CHALLENGE_HERO_IMAGE } from '@/constants/challenge-hero';

// Entries: velocity-based trending (getTrendingVideos), not viewsCount.
// Challenge hero: real active challenge when available.

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatCountdown(endAt: Date | null): string {
  if (!endAt) return '—';
  const now = new Date();
  const end = new Date(endAt);
  if (end <= now) return 'Ended';
  const ms = end.getTime() - now.getTime();
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days > 0) return `${days} day${days !== 1 ? 's' : ''} left`;
  if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''} left`;
  return 'Ending soon';
}

const RANK_LABELS: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd' };

export default async function TrendingPage() {
  let viewer: Awaited<ReturnType<typeof getCurrentUser>> = null;
  let featuredChallenge: Awaited<ReturnType<typeof listChallenges>>[0] | null = null;
  let featuredChallengeMaxSec: number | null = null;
  let leaderboard: ChallengeLeaderboardEntry[] = [];
  let entriesForCards: Array<{
    id: string;
    title: string;
    thumbnailUrl?: string;
    visibility: VideoVisibility;
    creator: {
      id: string;
      displayName: string;
      username: string;
      country?: string;
      avatarUrl?: string;
      verified: boolean;
      verificationLevel?: string;
    };
    stats: {
      likesCount: number;
      viewsCount: number;
      commentsCount: number;
      votesCount: number;
      talentScore: number | null;
    };
  }> = [];
  let serviceUnavailable = false;

  try {
    viewer = await getCurrentUser();
    const [trendResult, challenges] = await Promise.all([
      getTrendingVideos({ window: '24h', limit: 24 }),
      listChallenges(1),
    ]);

    featuredChallenge = challenges[0] ?? null;
    featuredChallengeMaxSec =
      featuredChallenge != null
        ? getLiveChallengeRecordingCapSec(featuredChallenge.maxDurationSec ?? CHALLENGE_MAX_DURATION_SEC_DB_DEFAULT)
        : null;
    leaderboard = featuredChallenge
      ? await getChallengeLeaderboard(featuredChallenge.id, 3, { viewerUserId: viewer?.id ?? null })
      : [];

    const videoIds = await filterVideoIdsForFeedViewer(trendResult.videoIds, viewer?.id ?? null);
    const videos =
      videoIds.length > 0
        ? await prisma.video.findMany({
            where: {
              id: { in: videoIds },
              ...CANONICAL_PUBLIC_VIDEO_WHERE,
              videoUrl: { not: null },
            },
            include: {
              creator: {
                select: {
                  id: true,
                  displayName: true,
                  username: true,
                  country: true,
                  avatarUrl: true,
                  isVerified: true,
                  creatorVerification: { where: { verificationStatus: 'APPROVED' }, select: { verificationLevel: true } },
                },
              },
            },
          })
        : [];

    const videoMap = new Map(videos.map((v) => [v.id, v]));
    const entries = videoIds.map((id) => videoMap.get(id)).filter(Boolean) as typeof videos;
    entriesForCards = entries.map((v) => {
      const creator = v.creator as { creatorVerification?: { verificationLevel: string } | null };
      return {
        id: v.id,
        title: v.title,
        thumbnailUrl: v.thumbnailUrl ?? undefined,
        visibility: v.visibility,
        creator: {
          id: v.creator.id,
          displayName: v.creator.displayName,
          username: v.creator.username,
          country: v.creator.country ?? undefined,
          avatarUrl: v.creator.avatarUrl ?? undefined,
          verified: v.creator.isVerified,
          verificationLevel: creator?.creatorVerification?.verificationLevel ?? undefined,
        },
        stats: {
          likesCount: v.likesCount,
          viewsCount: v.viewsCount,
          commentsCount: v.commentsCount,
          votesCount: v.votesCount,
          talentScore: v.talentScore,
        },
      };
    });
  } catch (e) {
    if (!isDatabaseUnavailableError(e)) throw e;
    serviceUnavailable = true;
  }

  return (
    <div className="pb-24 md:pb-12 min-w-0 overflow-x-hidden" style={{ backgroundColor: '#0D0D0E' }}>
      <div className="w-full pt-5 laptop:pt-5 desktop:pt-6 space-y-6 laptop:space-y-8 desktop:space-y-9 xl-screen:space-y-10 min-w-0">
        {serviceUnavailable ? (
          <p
            className="text-center text-[13px] text-amber-200/90 px-4 py-2.5 rounded-xl bg-amber-950/35 border border-amber-900/40 mx-0"
            role="alert"
          >
            Service temporarily unavailable — trending data could not be loaded. Please try again shortly.
          </p>
        ) : null}
        {/* 1. CHALLENGE HERO — real challenge when available */}
        <section className="relative h-[260px] md:h-[280px] laptop:h-[300px] desktop:h-[360px] xl-screen:h-[400px] max-h-[min(400px,50vh)] rounded-2xl overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, rgba(177,18,38,0.3) 0%, rgba(13,13,14,0.85) 50%), url(${JSON.stringify(DEFAULT_CHALLENGE_HERO_IMAGE)}) center/cover`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />
          <div className="relative h-full flex flex-col justify-end p-5 laptop:p-6 desktop:p-8 min-w-0 overflow-hidden">
            <span className="text-accent text-sm font-semibold mb-1.5">
              {featuredChallenge ? 'Weekly Challenge' : 'Trending'}
            </span>
            <h1 className="font-display text-[clamp(1.25rem,3vw,2rem)] font-bold text-white mb-1.5 leading-tight truncate">
              {featuredChallenge?.title ?? 'Trending Performances'}
            </h1>
            <p className="text-[14px] text-[#B7BDC7] mb-1 truncate">
              {featuredChallenge?.artistTheme ?? 'Velocity-ranked by engagement in the last 24 hours'}
            </p>
            <p className="text-[13px] text-[#7F8792] mb-4 laptop:mb-6 truncate">
              {featuredChallenge
                ? `${new Date(featuredChallenge.startAt).toLocaleDateString()} – ${new Date(featuredChallenge.endAt).toLocaleDateString()} · ${formatCountdown(featuredChallenge.endAt)}`
                : `${entriesForCards.length} performances trending now`}
            </p>
            <div className="flex flex-wrap gap-2 md:gap-3">
              {featuredChallenge ? (
                <Link
                  href={`/challenges/${featuredChallenge.slug}`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-hover transition-colors shadow-[0_10px_30px_rgba(177,18,38,0.35)]"
                >
                  Join Challenge
                </Link>
              ) : (
                <Link
                  href="/upload"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-hover transition-colors shadow-[0_10px_30px_rgba(177,18,38,0.35)]"
                >
                  Upload Performance
                </Link>
              )}
              <a
                href="#entries"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 text-white font-semibold text-sm border border-white/20 hover:bg-white/15 transition-colors"
              >
                Watch Entries
              </a>
            </div>
          </div>
        </section>

        {/* 2. INFO STRIP — real stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 laptop:gap-4 desktop:gap-6 min-w-0">
          {[
            { label: 'Trending Now', value: `${entriesForCards.length} videos` },
            { label: 'Time Window', value: 'Last 24h' },
            { label: 'Top Category', value: featuredChallenge?.categoryName ?? 'All' },
            { label: 'Current Leader', value: leaderboard[0]?.displayName ?? '—' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="glass-panel glass-panel-card flex flex-col justify-center p-3 md:p-4 laptop:p-5 border border-[rgba(255,255,255,0.08)] min-w-0 overflow-hidden"
              style={{ minHeight: 72 }}
            >
              <p className="text-[12px] laptop:text-[13px] text-text-secondary font-medium mb-0.5 truncate">{stat.label}</p>
              <p className="text-base md:text-lg laptop:text-xl font-bold text-text-primary truncate">{stat.value}</p>
            </div>
          ))}
        </section>

        {/* 3. RULES BLOCK + CTA */}
        <section className="grid md:grid-cols-3 gap-5 laptop:gap-6 desktop:gap-8 min-w-0">
          <div className="md:col-span-2 glass-panel p-5 laptop:p-6 min-w-0 overflow-hidden">
            <h2 className="font-display text-lg laptop:text-xl font-semibold text-text-primary mb-3 laptop:mb-4">
              {featuredChallenge ? 'Rules & Guidelines' : 'How Trending Works'}
            </h2>
            <ul className="space-y-2.5 laptop:space-y-3 text-[14px] laptop:text-[15px] text-text-secondary leading-relaxed">
              {(featuredChallenge
                ? [
                    'Submit a performance matching the challenge theme.',
                    `Performance must be ${featuredChallengeMaxSec ?? '—'} seconds or shorter.`,
                    'One entry per participant. Multiple takes allowed before final submit.',
                    'Community votes and support count toward ranking.',
                  ]
                : [
                    'Trending is ranked by engagement velocity: likes, comments, gifts, and super votes in the last 24 hours.',
                    'High watch completion and rapid support growth boost ranking.',
                    'Upload your best performance to get discovered.',
                  ]
              ).map((rule, i) => (
                <li key={i} className="flex gap-3 min-w-0">
                  <span className="text-accent shrink-0">•</span>
                  <span className="break-words min-w-0">{rule}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="glass-panel p-5 laptop:p-6 flex flex-col justify-center items-center text-center border border-[rgba(255,255,255,0.08)] min-w-0 overflow-hidden">
            <h3 className="font-display text-base laptop:text-lg font-semibold text-text-primary mb-2">Ready to compete?</h3>
            <p className="text-[13px] laptop:text-[14px] text-text-secondary mb-4 laptop:mb-6">Submit your entry before the deadline.</p>
            <Link
              href="/upload"
              className="w-full inline-flex justify-center items-center px-4 py-2.5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-hover transition-colors"
            >
              Submit Entry
            </Link>
          </div>
        </section>

        {/* 4. LEADERBOARD PREVIEW — real when challenge has entries */}
        {leaderboard.length > 0 && (
          <section className="min-w-0 overflow-hidden">
            <h2 className="font-display text-xl md:text-2xl font-semibold text-text-primary mb-3 laptop:mb-4">Top 3</h2>
            <div className="flex flex-wrap gap-3 laptop:gap-4 desktop:gap-6">
              {leaderboard.map((entry) => (
                <Link
                  key={entry.creatorId}
                  href={`/profile/${entry.username}`}
                  className="flex-shrink-0 w-full sm:w-[240px] min-w-0 glass-panel glass-panel-card p-4 border border-[rgba(255,255,255,0.08)] hover:border-accent/30 transition-all group overflow-hidden"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="relative flex-shrink-0 overflow-visible">
                      <div className="w-14 h-14 rounded-full bg-canvas-tertiary overflow-hidden flex items-center justify-center text-text-secondary font-bold text-lg">
                        {entry.avatarUrl ? (
                          <img src={entry.avatarUrl} alt="" className="avatar-image h-full w-full" />
                        ) : (
                          (entry.displayName ?? entry.username).charAt(0)
                        )}
                      </div>
                      <span
                        className="absolute -top-0.5 -right-0.5 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-sm"
                        style={{ backgroundColor: entry.rank === 1 ? '#B11226' : entry.rank === 2 ? '#7F8792' : '#5A4A2E' }}
                      >
                        {RANK_LABELS[entry.rank]}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden flex flex-col justify-center gap-0.5">
                      <p className="font-semibold text-[13px] text-text-primary truncate">{entry.displayName ?? entry.username}</p>
                      <p className="text-[12px] text-text-secondary flex items-center gap-1.5 min-w-0">
                        {entry.country && <span className="flex-shrink-0 text-[16px]" aria-hidden>{getFlagEmoji(entry.country)}</span>}
                        <span className="flex-shrink-0">·</span>
                        <span className="truncate tabular-nums">{formatCount(entry.votes)} votes</span>
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {featuredChallenge && (
              <Link
                href={`/challenges/${featuredChallenge.slug}`}
                className="inline-block mt-4 text-accent text-[15px] font-medium hover:text-accent-hover transition-colors"
              >
                View full leaderboard →
              </Link>
            )}
          </section>
        )}

        {/* 5. ENTRIES GRID — velocity-based trending (real ranking logic) */}
        <section id="entries" className="min-w-0 overflow-hidden">
          <h2 className="font-display text-[clamp(1.25rem,1.6vw,1.5rem)] font-semibold text-text-primary mb-3 laptop:mb-4">
            Trending Performances
          </h2>
          {entriesForCards.length > 0 ? (
            <div className="grid grid-cols-card-discovery md:grid-cols-card-discovery-md laptop:grid-cols-card-discovery-laptop desktop:grid-cols-card-discovery-desktop xl-screen:grid-cols-card-discovery-xl ultrawide:grid-cols-card-discovery-ultrawide 5k:grid-cols-card-discovery-5k gap-3 laptop:gap-4 desktop:gap-5 items-stretch">
              {entriesForCards.map((v) => (
                <VideoCard
                  key={v.id}
                  id={v.id}
                  title={v.title}
                  thumbnailUrl={v.thumbnailUrl}
                  visibility={v.visibility}
                  creator={v.creator}
                  stats={v.stats}
                  cardSize="discovery"
                  className="w-full"
                />
              ))}
            </div>
          ) : (
            <FeedEmptyState
              title="No entries yet"
              description="Only READY, approved performances appear here. Upload and complete processing to see your entry."
            />
          )}
        </section>
      </div>
    </div>
  );
}
