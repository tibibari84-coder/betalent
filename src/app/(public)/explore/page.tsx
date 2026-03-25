import Link from 'next/link';
import { Suspense } from 'react';
import VideoCard from '@/components/video/VideoCard';
import OpenPerformanceModalTrigger from '@/components/performance/OpenPerformanceModalTrigger';
import { ExploreRailCard } from '@/components/explore/ExploreRailCard';
import type { RailCard } from '@/components/explore/ExploreRailCard';
import { CategoryDiscoveryStrip } from '@/components/explore/CategoryDiscoveryStrip';
import { ExploreSuggestedCreatorsStrip } from '@/components/explore/ExploreSuggestedCreatorsStrip';
import { FeedEmptyState } from '@/components/feed/FeedEmptyState';
import ExploreHeroCarousel from '@/components/explore/ExploreHeroCarousel';
import { VOCAL_STYLES } from '@/constants/categories';
import { getFlagEmoji } from '@/lib/countries';
import { formatViews, formatChallengeCountdown as formatChallengeCountdownFn } from '@/lib/formatters';
import { FeaturedChallengeLiveWindows } from '@/components/challenge/FeaturedChallengeLiveWindows';
import { prisma } from '@/lib/prisma';
import { IconPlay, IconTrophy, IconCompass, IconUser } from '@/components/ui/Icons';
import { search, type SearchResult } from '@/services/search.service';
import { CARD_BASE_STYLE } from '@/constants/card-design-system';
import { CANONICAL_PUBLIC_VIDEO_WHERE } from '@/lib/video-moderation';
import { videoDiscoveryVisibilityWhere } from '@/lib/discovery-visibility';
import { getCurrentUser } from '@/lib/auth';
import { isDatabaseUnavailableError } from '@/lib/db-errors';

// Public explore: only real READY + APPROVED videos. No fake/demo cards. Premium empty state when none.

const READY_WHERE = CANONICAL_PUBLIC_VIDEO_WHERE;

async function getExploreData(viewerUserId: string | null) {
  const discoverWhere = {
    AND: [READY_WHERE, videoDiscoveryVisibilityWhere(viewerUserId)],
  };
  const [trending, newVoices, allForRails, featuredChallenge] = await Promise.all([
    prisma.video.findMany({
      where: discoverWhere,
      take: 6,
      orderBy: { viewsCount: 'desc' },
      include: {
        creator: { select: { id: true, displayName: true, username: true, country: true, avatarUrl: true } },
        category: { select: { name: true } },
      },
    }),
    prisma.video.findMany({
      where: discoverWhere,
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: {
        creator: { select: { id: true, displayName: true, username: true, country: true, avatarUrl: true } },
        category: { select: { name: true } },
      },
    }),
    prisma.video.findMany({
      where: discoverWhere,
      take: 30,
      orderBy: { viewsCount: 'desc' },
      include: {
        creator: { select: { id: true, displayName: true, username: true, country: true } },
        category: { select: { name: true } },
      },
    }),
    prisma.challenge.findFirst({
      where: { status: { in: ['ENTRY_OPEN', 'ENTRY_CLOSED', 'LIVE_UPCOMING', 'LIVE_ACTIVE'] } },
      orderBy: { endAt: 'asc' },
      include: {
        _count: { select: { entries: { where: { status: 'ACTIVE' } } } },
        windows: { orderBy: { displayOrder: 'asc' }, select: { id: true, regionLabel: true, timezone: true, startsAt: true, endsAt: true, status: true } },
      },
    }),
  ]);

  const toRailCard = (v: { id: string; viewsCount: number; creator: { displayName: string; username: string; country: string | null }; category: { name: string } }): RailCard => ({
    id: v.id,
    name: v.creator.displayName,
    country: v.creator.country ?? '',
    category: v.category.name,
    views: `${formatViews(v.viewsCount)} views`,
  });

  const railItems = allForRails.map(toRailCard);
  const rails = railItems.length > 0
    ? [
        { title: 'Trending Performances', href: '/trending', items: railItems.slice(0, 8) },
        { title: 'Rising Voices', href: '/explore?sort=rising', items: railItems.slice(0, 6) },
      ]
    : [];

  const spotlight = trending[0] ?? null;
  const featuredPerformers = Array.from(
    new Map(trending.map((v) => [v.creator.username, { id: v.creator.username, name: v.creator.displayName, country: v.creator.country ?? '', genre: v.category.name, stats: `${formatViews(v.viewsCount)} views` }])).values()
  ).slice(0, 4);

  return {
    featuredChallenge,
    formatChallengeCountdown: formatChallengeCountdownFn,
    trending: trending.map((x) => ({
      id: x.id,
      title: x.title,
      thumbnailUrl: x.thumbnailUrl ?? undefined,
      visibility: x.visibility,
      creator: {
        id: x.creator.id,
        displayName: x.creator.displayName,
        username: x.creator.username,
        country: x.creator.country ?? undefined,
        avatarUrl: x.creator.avatarUrl ?? undefined,
      },
      stats: { likesCount: x.likesCount, viewsCount: x.viewsCount, commentsCount: x.commentsCount, votesCount: x.votesCount, talentScore: x.talentScore },
    })),
    newVoices: newVoices.map((x) => ({
      id: x.id,
      title: x.title,
      thumbnailUrl: x.thumbnailUrl ?? undefined,
      visibility: x.visibility,
      creator: {
        id: x.creator.id,
        displayName: x.creator.displayName,
        username: x.creator.username,
        country: x.creator.country ?? undefined,
        avatarUrl: x.creator.avatarUrl ?? undefined,
      },
      stats: { likesCount: x.likesCount, viewsCount: x.viewsCount, commentsCount: x.commentsCount, votesCount: x.votesCount, talentScore: x.talentScore },
    })),
    rails,
    featuredPerformers,
    spotlight,
  };
}

function DiscoveryRail({ title, href, items }: { title: string; href?: string; items: RailCard[] }) {
  return (
    <section className="min-w-0">
      <div className="flex items-baseline justify-between gap-3 mb-2.5 laptop:mb-3 min-w-0 overflow-hidden">
        <h2 className="font-display text-[clamp(1.2rem,1.5vw,1.75rem)] font-semibold truncate min-w-0 leading-[1.3]" style={{ color: '#F5F7FA' }}>{title}</h2>
        {href && (
          <Link href={href} className="text-accent text-[14px] font-medium hover:text-accent-hover transition-colors shrink-0 leading-[1.3]">
            See all
          </Link>
        )}
      </div>
      <div className="relative min-w-0 -mx-[var(--layout-pad,16px)] tablet:mx-0">
        <div className="flex gap-2.5 md:gap-3 overflow-x-auto overflow-y-hidden pb-2 scroll-smooth snap-x snap-mandatory scrollbar-thin px-[var(--layout-pad,16px)] tablet:px-0" style={{ scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
          {items.map((card) => (
            <div key={card.id} className="snap-start">
              <ExploreRailCard card={card} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
      <div className="flex items-baseline justify-between gap-3 mb-2.5 laptop:mb-3 min-w-0 overflow-hidden">
        <h2 className="font-display text-[clamp(1.2rem,1.5vw,1.75rem)] font-semibold truncate min-w-0 leading-[1.3]" style={{ color: '#F5F7FA' }}>{title}</h2>
      {href && (
        <Link href={href} className="text-accent text-[14px] font-medium hover:text-accent-hover transition-colors shrink-0 leading-[1.3] whitespace-nowrap">
          See all
        </Link>
      )}
    </div>
  );
}

interface ExplorePageProps {
  searchParams?: { q?: string; sort?: string };
}

const emptySearchResult = (): SearchResult => ({
  creators: [],
  performances: [],
  categories: [],
  styles: [],
});

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const currentUser = await getCurrentUser();
  const viewerId = currentUser?.id ?? null;
  const searchQuery = searchParams?.q?.trim();

  let searchResults: Awaited<ReturnType<typeof search>> | null = null;
  let exploreData: Awaited<ReturnType<typeof getExploreData>>;
  let serviceUnavailable = false;
  try {
    if (searchQuery && searchQuery.length >= 2) {
      searchResults = await search(searchQuery, 24, viewerId);
    }
    exploreData = await getExploreData(viewerId);
  } catch (e) {
    if (!isDatabaseUnavailableError(e)) throw e;
    serviceUnavailable = true;
    searchResults = searchQuery && searchQuery.length >= 2 ? emptySearchResult() : null;
    exploreData = {
      featuredChallenge: null,
      formatChallengeCountdown: formatChallengeCountdownFn,
      trending: [],
      newVoices: [],
      rails: [],
      featuredPerformers: [],
      spotlight: null,
    } as unknown as Awaited<ReturnType<typeof getExploreData>>;
  }

  const { trending, newVoices, rails, featuredPerformers, spotlight, featuredChallenge, formatChallengeCountdown } =
    exploreData;
  const hasAnyVideos = trending.length > 0 || newVoices.length > 0;
  const hasSearchResults = searchResults && (
    searchResults.creators.length > 0 ||
    searchResults.performances.length > 0 ||
    searchResults.categories.length > 0 ||
    searchResults.styles.length > 0
  );

  return (
    <div className="pb-24 md:pb-12 min-w-0 w-full" style={{ backgroundColor: '#0D0D0E' }}>
      <div className="layout-content pt-4 laptop:pt-5 desktop:pt-6 space-y-6 laptop:space-y-10 desktop:space-y-12 box-border">
        {serviceUnavailable ? (
          <p
            className="text-center text-[13px] text-amber-200/90 px-4 py-2.5 rounded-xl bg-amber-950/35 border border-amber-900/40"
            role="alert"
          >
            Service temporarily unavailable — discovery data could not be loaded. Please try again shortly.
          </p>
        ) : null}
        {/* 1. DISCOVERY HERO — premium 3-slide carousel */}
        <section className="min-w-0">
          <ExploreHeroCarousel />
        </section>

        {/* Search results — when q param present */}
        {hasSearchResults && searchResults && (
          <section className="min-w-0 space-y-6">
            <h2 className="font-display text-[clamp(1.25rem,1.6vw,1.5rem)] font-semibold text-text-primary">
              Search results for &quot;{searchQuery}&quot;
            </h2>
            {searchResults.creators.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-text-secondary mb-3">Creators</h3>
                <div className="explore-feed-grid">
                  {searchResults.creators.map((c) => (
                    <Link
                      key={c.id}
                      href={`/profile/${c.username}`}
                      className="min-h-[112px] laptop:min-h-[124px] w-full max-w-full rounded-[16px] overflow-hidden group flex min-w-0 transition-all duration-200 hover:border-[rgba(255,70,90,0.18)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.04)] hover:-translate-y-0.5"
                      style={CARD_BASE_STYLE}
                    >
                      <div className="shrink-0 w-10 h-10 laptop:w-12 laptop:h-12 rounded-full bg-accent/20 flex items-center justify-center m-3 overflow-hidden">
                        {c.avatarUrl ? (
                          <img src={c.avatarUrl} alt="" className="avatar-image h-full w-full" />
                        ) : (
                          <span className="text-base font-bold text-accent">{(c.displayName ?? c.username).charAt(0)}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 p-3 flex flex-col justify-center overflow-hidden">
                        <p className="font-semibold text-[13px] text-white truncate">{c.displayName ?? c.username}</p>
                        <p className="text-[13px] text-white/65 truncate mt-0.5">@{c.username}</p>
                        <p className="text-[12px] text-white/65 mt-1">{formatViews(c.followersCount)} followers</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {searchResults.performances.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-text-secondary mb-3">Performances</h3>
                <div className="explore-video-grid">
                  {searchResults.performances.map((v) => (
                    <VideoCard
                      key={v.id}
                      id={v.id}
                      title={v.title}
                      thumbnailUrl={v.thumbnailUrl ?? undefined}
                      visibility={v.visibility}
                      creator={{
                        id: v.creator.id,
                        displayName: v.creator.displayName,
                        username: v.creator.username,
                        avatarUrl: v.creator.avatarUrl ?? undefined,
                        country: v.creator.country ?? undefined,
                      }}
                      stats={{
                        likesCount: v.likesCount,
                        viewsCount: v.viewsCount,
                        commentsCount: 0,
                        votesCount: 0,
                      }}
                      cardSize="discovery"
                      className="w-full"
                    />
                  ))}
                </div>
              </div>
            )}
            {(searchResults.categories.length > 0 || searchResults.styles.length > 0) && (
              <div>
                <h3 className="text-sm font-semibold text-text-secondary mb-3">Categories & Styles</h3>
                <div className="flex flex-wrap gap-2">
                  {searchResults.categories.map((c) => (
                    <Link
                      key={c.slug}
                      href={`/explore?genre=${c.slug}`}
                      className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[14px] font-medium text-text-primary hover:bg-white/10 hover:border-accent/30 transition-colors"
                    >
                      {c.name}
                    </Link>
                  ))}
                  {searchResults.styles.map((s) => (
                    <Link
                      key={s.slug}
                      href={`/explore?style=${s.slug}`}
                      className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[14px] font-medium text-text-primary hover:bg-white/10 hover:border-accent/30 transition-colors"
                    >
                      {s.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {searchQuery && !hasSearchResults && (
          <section className="min-w-0">
            <FeedEmptyState
              title="No results found"
              description={`No creators, performances, or categories match "${searchQuery}". Try a different search.`}
            />
          </section>
        )}

        {/* Category discovery strip */}
        {!searchQuery && (
          <Suspense fallback={<div className="h-10 min-w-0" />}>
            <CategoryDiscoveryStrip />
          </Suspense>
        )}

        {!searchQuery && (
          <ExploreSuggestedCreatorsStrip />
        )}

        {/* Editorial block — Weekly Challenge + How discovery works */}
        {!searchQuery && (
        <section className="min-w-0 grid grid-cols-1 md:grid-cols-2 gap-3 laptop:gap-[18px]">
          {/* Weekly Challenge card */}
          {featuredChallenge ? (
            <Link
              href={`/challenges/${featuredChallenge.slug}`}
              className="group block rounded-[16px] overflow-hidden transition-all duration-300 hover:border-[rgba(255,70,90,0.18)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.04)] hover:-translate-y-0.5"
              style={CARD_BASE_STYLE}
            >
              <div className="p-5 laptop:p-6 flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center border border-accent/30">
                  <IconTrophy className="w-6 h-6 text-accent" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent/90 mb-1">Weekly Challenge</p>
                  <h3 className="font-display text-[17px] laptop:text-[18px] font-semibold text-white mb-1.5 truncate group-hover:text-accent/90 transition-colors">{featuredChallenge.title}</h3>
                  <p className="text-[13px] text-[#B7BDC7] mb-3 line-clamp-2">{featuredChallenge.description ?? 'Compete for the spotlight.'}</p>
                  <p className="text-[12px] text-[#7F8792]">{featuredChallenge._count.entries.toLocaleString()} entries · Ends in {formatChallengeCountdown(featuredChallenge.votingCloseAt ?? featuredChallenge.endAt)}</p>
                  {featuredChallenge.windows && featuredChallenge.windows.length > 0 && (
                    <FeaturedChallengeLiveWindows windows={featuredChallenge.windows} />
                  )}
                </div>
              </div>
            </Link>
          ) : (
            <div
              className="rounded-[16px] p-5 laptop:p-6 flex items-start gap-4"
              style={CARD_BASE_STYLE}
            >
              <div className="shrink-0 w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center border border-accent/25">
                <IconTrophy className="w-6 h-6 text-accent/80" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent/80 mb-1">Weekly Challenge</p>
                <h3 className="font-display text-[17px] font-semibold text-white mb-2">No challenge live yet</h3>
                <p className="text-[13px] text-[#B7BDC7] mb-4">Weekly challenges are where talent meets opportunity. Check back soon or browse open challenges.</p>
                <Link href="/challenges" className="inline-flex items-center justify-center h-10 px-4 rounded-xl text-[13px] font-semibold border border-white/20 text-white hover:bg-white/10 transition-colors">
                  Browse Challenges
                </Link>
              </div>
            </div>
          )}
          {/* How discovery works card */}
          <div
            className="rounded-[16px] p-5 laptop:p-6"
            style={CARD_BASE_STYLE}
          >
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center border border-accent/20">
                <IconCompass className="w-6 h-6 text-[#B7BDC7]" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9ca3af] mb-1">How it works</p>
                <h3 className="font-display text-[17px] laptop:text-[18px] font-semibold text-white mb-2">Discovery on BETALENT</h3>
                <p className="text-[13px] text-[#B7BDC7] leading-relaxed">
                  Performances are ranked by real engagement—views, likes, votes, and challenge results. Filter by style, explore trending talent, and support the voices you love.
                </p>
              </div>
            </div>
          </div>
        </section>
        )}

        {/* HORIZONTAL DISCOVERY RAILS — real READY videos only (hide when searching) */}
        {!searchQuery && rails.map((rail) => (
          <DiscoveryRail key={rail.title} title={rail.title} href={rail.href} items={rail.items} />
        ))}

        {/* 2. FEATURED PERFORMERS — only when we have real candidates from trending (no empty marketing shell) */}
        {!searchQuery && featuredPerformers.length > 0 && (
        <section id="featured-performers" className="min-w-0">
          <SectionHeader title="Featured Performers" href="/trending" />
            <div className="explore-featured-grid">
              {featuredPerformers.map((p) => (
                <Link
                  key={p.id}
                  href={`/profile/${p.id}`}
                  className="min-h-[120px] sm:min-h-[128px] laptop:min-h-[136px] w-full rounded-[16px] overflow-hidden group flex flex-row items-stretch min-w-0 transition-all duration-200 hover:border-[rgba(255,70,90,0.18)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.04)] hover:-translate-y-0.5"
                  style={CARD_BASE_STYLE}
                >
                  <div className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 laptop:w-16 laptop:h-16 rounded-full bg-accent/20 flex items-center justify-center m-3.5 sm:m-4 laptop:m-5 self-center">
                    <span className="text-lg sm:text-xl laptop:text-2xl font-bold text-accent">{p.name.charAt(0)}</span>
                  </div>
                  <div className="min-w-0 flex-1 py-3.5 pr-4 sm:pr-5 laptop:py-5 flex flex-col justify-center gap-1 overflow-hidden">
                    <p className="font-semibold text-[14px] sm:text-[15px] laptop:text-[16px] text-white leading-snug line-clamp-2 break-words">{p.name}</p>
                    <p className="text-[13px] sm:text-[14px] text-[#B7BDC7] leading-snug line-clamp-2 break-words">
                      {p.country ? `${getFlagEmoji(p.country)} ` : ''}
                      <span className="text-white/40">·</span> {p.genre}
                    </p>
                    <p className="text-[12px] sm:text-[13px] text-[#7F8792] line-clamp-1">{p.stats}</p>
                  </div>
                </Link>
              ))}
            </div>
        </section>
        )}

        {/* 3. TRENDING NOW — real READY only (hide when searching) */}
        {!searchQuery && (
        <section className="min-w-0">
          <SectionHeader title="Trending Now" href="/trending" />
          {trending.length > 0 ? (
            <div className="explore-video-grid">
              {trending.map((v) => (
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
            <FeedEmptyState compact />
          )}
        </section>
        )}

        {/* 4. NEW VOICES — real READY only (hide when searching) */}
        {!searchQuery && (
        <section className="min-w-0">
          <SectionHeader title="New Voices" href="/explore?sort=new" />
          {newVoices.length > 0 ? (
            <div className="explore-video-grid">
              {newVoices.map((v) => (
                <VideoCard
                  key={v.id}
                  id={v.id}
                  title={v.title}
                  thumbnailUrl={v.thumbnailUrl}
                  visibility={v.visibility}
                  creator={v.creator}
                  stats={v.stats}
                  badge="new"
                  cardSize="discovery"
                  className="w-full"
                />
              ))}
            </div>
          ) : (
            <FeedEmptyState title="No new voices yet" description="Fresh performances will appear here as creators upload and share their talent." compact />
          )}
        </section>
        )}

        {/* Global empty state when no videos at all (and not searching) */}
        {!searchQuery && !hasAnyVideos && (
          <section className="min-w-0">
            <FeedEmptyState
              title="No performances to explore yet"
              description="Upload your talent or check back later. Only READY, approved performances appear here."
            />
          </section>
        )}

        {/* Bottom support section — Become a performer, Compete, Build profile */}
        {!searchQuery && (
        <section className="min-w-0 pt-2 laptop:pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 laptop:gap-[18px]">
            <Link
              href="/upload"
              className="group block rounded-[16px] p-5 laptop:p-6 transition-all duration-300 hover:border-[rgba(255,70,90,0.18)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.04)] hover:-translate-y-0.5"
              style={CARD_BASE_STYLE}
            >
              <div className="w-11 h-11 rounded-xl bg-accent/15 flex items-center justify-center mb-3 group-hover:bg-accent/25 transition-colors">
                <IconPlay className="w-5 h-5 text-accent" aria-hidden />
              </div>
              <h3 className="font-display text-[16px] laptop:text-[17px] font-semibold text-white mb-1.5">Become a performer</h3>
              <p className="text-[13px] text-[#B7BDC7] leading-relaxed">Upload your first performance and join the global stage.</p>
            </Link>
            <Link
              href="/challenges"
              className="group block rounded-[16px] p-5 laptop:p-6 transition-all duration-300 hover:border-[rgba(255,70,90,0.18)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.04)] hover:-translate-y-0.5"
              style={CARD_BASE_STYLE}
            >
              <div className="w-11 h-11 rounded-xl bg-accent/15 flex items-center justify-center mb-3 group-hover:bg-accent/25 transition-colors">
                <IconTrophy className="w-5 h-5 text-accent" aria-hidden />
              </div>
              <h3 className="font-display text-[16px] laptop:text-[17px] font-semibold text-white mb-1.5">Compete in challenges</h3>
              <p className="text-[13px] text-[#B7BDC7] leading-relaxed">Enter weekly competitions and compete for the spotlight.</p>
            </Link>
            <Link
              href="/upload"
              className="group block rounded-[16px] p-5 laptop:p-6 transition-all duration-300 hover:border-[rgba(255,70,90,0.18)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.04)] hover:-translate-y-0.5"
              style={CARD_BASE_STYLE}
            >
              <div className="w-11 h-11 rounded-xl bg-accent/15 flex items-center justify-center mb-3 group-hover:bg-accent/25 transition-colors">
                <IconUser className="w-5 h-5 text-accent" aria-hidden />
              </div>
              <h3 className="font-display text-[16px] laptop:text-[17px] font-semibold text-white mb-1.5">Build your profile</h3>
              <p className="text-[13px] text-[#B7BDC7] leading-relaxed">Create your creator profile and grow your audience.</p>
            </Link>
          </div>
        </section>
        )}
      </div>
    </div>
  );
}
