import Link from 'next/link';
import { APP_NAME } from '@/constants/app';
import { getSession } from '@/lib/session';
import OpenPerformanceModalTrigger from '@/components/performance/OpenPerformanceModalTrigger';
import { FeedEmptyState } from '@/components/feed/FeedEmptyState';
import { VOCAL_STYLES } from '@/constants/categories';
import {
  IconCompass,
  IconTrophy,
  IconGift,
  IconPlay,
  IconAward,
  IconTrendingUp,
  IconUpload,
} from '@/components/ui/Icons';
import { getFlagEmoji } from '@/lib/countries';
import { formatChallengeCountdown as formatChallengeCountdownFn } from '@/lib/formatters';
import { FeaturedChallengeLiveWindows } from '@/components/challenge/FeaturedChallengeLiveWindows';
import { prisma } from '@/lib/prisma';
import {
  ACCENT_HEX,
  accentAlpha,
  ACCENT_PRIMARY_GRADIENT,
} from '@/constants/accent-tokens';
import { CANONICAL_PUBLIC_VIDEO_WHERE } from '@/lib/video-moderation';
import { userDiscoveryVisibilityWhere, videoDiscoveryVisibilityWhere } from '@/lib/discovery-visibility';
import { isDatabaseUnavailableError } from '@/lib/db-errors';

const WHY_ITEMS = [
  { icon: IconCompass, title: 'Discover Global Talent', desc: 'From singers to instrumentalists, soloists to bands. One stage, infinite possibilities.' },
  { icon: IconTrophy, title: 'Weekly Competitions', desc: 'Compete for the spotlight. Top performers get featured and build their audience.' },
  { icon: IconGift, title: 'Support Creators', desc: 'Send gifts, vote for favorites, and help talents thrive on their journey.' },
];

const READY_WHERE = CANONICAL_PUBLIC_VIDEO_WHERE;

async function getLandingVideos(viewerUserId: string | null) {
  const discoverWhere = { AND: [READY_WHERE, videoDiscoveryVisibilityWhere(viewerUserId)] };
  const [featured, trending, featuredChallenge] = await Promise.all([
    prisma.video.findFirst({
      where: discoverWhere,
      orderBy: { viewsCount: 'desc' },
      include: { creator: { select: { displayName: true, country: true } }, category: { select: { name: true } } },
    }),
    prisma.video.findMany({
      where: discoverWhere,
      take: 4,
      orderBy: { viewsCount: 'desc' },
      include: { creator: { select: { displayName: true, country: true } } },
    }),
    prisma.challenge.findFirst({
      where: { status: { in: ['ENTRY_OPEN', 'ENTRY_CLOSED', 'LIVE_UPCOMING', 'LIVE_ACTIVE'] } },
      orderBy: { endAt: 'asc' },
      include: {
        _count: { select: { entries: { where: { status: 'ACTIVE' } } } },
        windows: { orderBy: { displayOrder: 'asc' }, select: { id: true, regionLabel: true, timezone: true, startsAt: true, endsAt: true, status: true } },
        entries: {
          take: 1,
          where: {
            status: 'ACTIVE',
            creator: userDiscoveryVisibilityWhere(viewerUserId),
          },
          orderBy: { joinedAt: 'desc' },
          include: {
            creator: { select: { displayName: true, country: true } },
            video: { select: { id: true } },
          },
        },
      },
    }),
  ]);
  const topEntry = featuredChallenge?.entries[0];
  const topPerformer = topEntry
    ? { name: topEntry.creator.displayName, country: topEntry.creator.country ?? '' }
    : null;
  return { featured, trending, featuredChallenge, topPerformer, formatChallengeCountdown: formatChallengeCountdownFn };
}

const SECTION_SPACING = 'space-y-8 laptop:space-y-10 desktop:space-y-12';
const TITLE_TO_CONTENT = 'mb-3 laptop:mb-4';

export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  const session = await getSession();
  const viewerId = session.user?.id ?? null;
  const isAppMember = Boolean(session.user && !session.pending2FAUserId && session.user.emailVerified);
  let featured: Awaited<ReturnType<typeof getLandingVideos>>['featured'];
  let trending: Awaited<ReturnType<typeof getLandingVideos>>['trending'];
  let featuredChallenge: Awaited<ReturnType<typeof getLandingVideos>>['featuredChallenge'];
  let topPerformer: Awaited<ReturnType<typeof getLandingVideos>>['topPerformer'];
  let formatChallengeCountdown = formatChallengeCountdownFn;
  let serviceUnavailable = false;
  try {
    const data = await getLandingVideos(viewerId);
    featured = data.featured;
    trending = data.trending;
    featuredChallenge = data.featuredChallenge;
    topPerformer = data.topPerformer;
    formatChallengeCountdown = data.formatChallengeCountdown;
  } catch (e) {
    if (!isDatabaseUnavailableError(e)) throw e;
    serviceUnavailable = true;
    featured = null;
    trending = [];
    featuredChallenge = null;
    topPerformer = null;
  }

  return (
    <div className={`min-h-full min-w-0 overflow-hidden flex flex-col ${SECTION_SPACING}`}>
      {serviceUnavailable ? (
        <p
          className="text-center text-[13px] text-amber-200/90 px-4 py-2.5 bg-amber-950/35 border-b border-amber-900/40 shrink-0"
          role="alert"
        >
          Service temporarily unavailable — some content could not be loaded. Please try again shortly.
        </p>
      ) : null}
      <section
        className="relative flex items-center overflow-hidden pt-14 pb-20 md:pt-16 md:pb-24 tablet:pt-0 tablet:pb-24 laptop:pb-28 desktop:pb-32 min-h-0 max-h-[75vh]"
        aria-label="Hero"
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden max-h-[75vh]" aria-hidden>
          <div className="absolute inset-0 bg-gradient-to-b from-[#070707] via-[#120909] to-[#0a0707]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(196,18,47,0.06),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_55%,rgba(255,0,0,0.03),transparent_60%)]" />
        </div>
        <div className="relative w-full max-w-[1180px] mx-auto flex flex-col laptop:flex-row items-center laptop:items-center gap-6 laptop:gap-10 min-w-0 px-4 laptop:px-0">
          <div className="w-full min-w-0 max-w-[400px] laptop:max-w-[420px] laptop:flex-[0_1_420px] flex flex-col justify-center text-center laptop:text-left">
            <h1 className="font-display font-bold text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.08] tracking-[-0.02em] text-[#f5f5f5] mb-4">
              Show the World Your Talent
            </h1>
            <p className="text-[14px] leading-[1.65] max-w-[360px] mx-auto laptop:mx-0 text-[#9ca3af]">
              Join performers from around the world. Upload your talent, compete in weekly challenges, and let the audience decide who rises.
            </p>
            {isAppMember ? (
              <div className="flex flex-wrap justify-center laptop:justify-start gap-2.5 mt-5">
                <Link
                  href="/feed"
                  className="inline-flex items-center justify-center gap-2 font-semibold text-[13px] rounded-[10px] min-h-[40px] px-4"
                  style={{
                    background: ACCENT_PRIMARY_GRADIENT,
                    color: '#fff',
                    boxShadow: `0 2px 12px ${accentAlpha(0.25)}`,
                  }}
                >
                  <IconTrendingUp className="w-3.5 h-3.5 shrink-0" aria-hidden />
                  Go to feed
                </Link>
                <Link
                  href="/explore"
                  className="inline-flex items-center justify-center gap-2 font-medium text-[13px] min-h-[40px] px-4 rounded-[10px] border border-white/10 text-[#f5f5f5] hover:bg-white/[0.06]"
                >
                  <IconCompass className="w-3.5 h-3.5 shrink-0" aria-hidden />
                  Explore
                </Link>
              </div>
            ) : (
              <div className="flex flex-wrap justify-center laptop:justify-start gap-2.5 mt-5">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 font-semibold text-[13px] rounded-[10px] min-h-[40px] px-4"
                  style={{
                    background: ACCENT_PRIMARY_GRADIENT,
                    color: '#fff',
                    boxShadow: `0 2px 12px ${accentAlpha(0.25)}`,
                  }}
                >
                  Create account
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 font-medium text-[13px] min-h-[40px] px-4 rounded-[10px] border border-white/10 text-[#f5f5f5] hover:bg-white/[0.06]"
                >
                  Sign in
                </Link>
              </div>
            )}
          </div>
          {featured ? (
            <div className="hidden laptop:flex flex-[0_0_auto] w-full min-w-0 max-w-[360px] justify-center items-center">
              <OpenPerformanceModalTrigger
                videoId={featured.id}
                className="group block w-full max-w-[340px] rounded-[18px] overflow-hidden border border-white/[0.05]"
                style={{
                  background: 'rgba(15,15,15,0.55)',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.4), 0 0 32px rgba(196,18,47,0.04)',
                }}
              >
                <div className="relative h-[160px] rounded-t-[16px] overflow-hidden bg-canvas-tertiary">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: accentAlpha(0.18), border: `1px solid ${accentAlpha(0.35)}` }}>
                      <IconPlay className="w-8 h-8 ml-0.5" style={{ color: ACCENT_HEX }} aria-hidden />
                    </div>
                  </div>
                </div>
                <div className="px-3.5 py-3 border-t border-white/[0.05]">
                  <p className="text-[14px] font-semibold text-[#f5f5f5] truncate flex items-center gap-2">
                    <span>{featured.creator.displayName}</span>
                    {featured.creator.country && <span className="text-base" aria-hidden>{getFlagEmoji(featured.creator.country)}</span>}
                  </p>
                  <p className="text-[12px] text-[#9ca3af] truncate">{featured.category.name}</p>
                  <span className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-[10px] text-[12px] font-semibold text-white mt-2" style={{ background: ACCENT_PRIMARY_GRADIENT }}>
                    <IconPlay className="w-3.5 h-3.5 shrink-0" aria-hidden />
                    Watch Performance
                  </span>
                </div>
              </OpenPerformanceModalTrigger>
            </div>
          ) : null}
        </div>
      </section>

      {featuredChallenge ? (
        <section className="relative min-w-0 overflow-hidden" aria-labelledby="featured-challenge-heading">
          <div className="w-full max-w-full mx-auto">
            <h2 id="featured-challenge-heading" className={`font-display text-[clamp(1.35rem,2.2vw,1.875rem)] font-semibold ${TITLE_TO_CONTENT} text-[#f5f5f5]`}>
              Featured Weekly Challenge
            </h2>
            <article
              className="relative w-full min-h-[240px] rounded-[18px] overflow-hidden border border-[rgba(255,255,255,0.06)]"
              style={{
                background: 'linear-gradient(135deg, rgba(196,18,47,0.2) 0%, rgba(22,14,14,0.98) 45%, #120909 100%)',
              }}
            >
              <div className="relative flex flex-col laptop:flex-row laptop:items-stretch min-h-[240px] p-6 laptop:p-8">
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <h3 className="font-display font-bold text-[#f5f5f5] mb-4 text-[clamp(1.4rem,2.8vw,2rem)]">{featuredChallenge.title}</h3>
                  <p className="text-[15px] leading-relaxed mb-4 max-w-[520px] text-[#9ca3af]">{featuredChallenge.description ?? 'Show the world your talent.'}</p>
                  <div className="flex flex-wrap gap-3">
                    <Link href={`/challenges/${featuredChallenge.slug}`} className="inline-flex items-center justify-center gap-2 font-semibold text-[14px] rounded-[12px] min-h-[44px] px-5 text-white" style={{ background: ACCENT_PRIMARY_GRADIENT }}>
                      <IconPlay className="w-4 h-4 shrink-0" aria-hidden />
                      View Challenge
                    </Link>
                    {featuredChallenge.windows && featuredChallenge.windows.length > 0 && (
                      <FeaturedChallengeLiveWindows windows={featuredChallenge.windows} />
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-3 p-4 laptop:p-6 border-t laptop:border-t-0 laptop:border-l border-[rgba(255,255,255,0.05)] laptop:max-w-[220px]">
                  <div>
                    <p className="text-[11px] font-semibold uppercase text-[#9ca3af]">Top Performer</p>
                    <p className="text-[14px] font-semibold text-[#f5f5f5]">{topPerformer?.name ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase text-[#9ca3af]">Entries</p>
                    <p className="text-[18px] font-bold text-[#f5f5f5]">{featuredChallenge._count.entries.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>
      ) : null}

      <section className="relative min-w-0 overflow-hidden">
        <div className="w-full max-w-full mx-auto">
          <h2 className={`font-display text-[clamp(1.35rem,2.2vw,1.875rem)] font-semibold ${TITLE_TO_CONTENT} text-[#f5f5f5]`}>
            Explore by Style
          </h2>
          <div className="flex flex-wrap gap-3">
            {VOCAL_STYLES.filter((s) => s.slug !== '').map((style) => (
              <Link
                key={style.slug}
                href={`/explore?style=${encodeURIComponent(style.slug)}`}
                className="px-4 py-2.5 rounded-[14px] border border-[rgba(255,255,255,0.06)] text-[13px] font-medium text-[#f5f5f5]"
                style={{ background: 'rgba(15,15,15,0.5)', backdropFilter: 'blur(12px)' }}
              >
                {style.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="relative min-w-0 overflow-hidden">
        <div className="w-full max-w-full mx-auto">
          <div className={`flex items-center justify-between gap-3 ${TITLE_TO_CONTENT}`}>
            <h2 className="font-display text-[clamp(1.35rem,2.2vw,1.875rem)] font-semibold text-[#f5f5f5]">Trending Now</h2>
            <Link href="/explore" className="text-accent text-[15px] font-medium">View all</Link>
          </div>
          {trending.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 laptop:gap-4">
              {trending.map((video) => (
                <OpenPerformanceModalTrigger
                  key={video.id}
                  videoId={video.id}
                  className="group block rounded-[18px] overflow-hidden border border-white/[0.06] min-h-[280px]"
                  style={{ background: 'rgba(15,15,15,0.6)', backdropFilter: 'blur(14px)' }}
                >
                  <div className="aspect-[2/3] bg-canvas-tertiary relative overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-20 h-20 rounded-full bg-[rgba(196,18,47,0.15)] flex items-center justify-center">
                        <IconPlay className="w-10 h-10 text-accent" />
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                      <p className="text-[13px] font-medium text-[#f5f5f5] truncate">{video.creator.displayName}</p>
                      <p className="text-[12px] text-[#9ca3af]">{video.viewsCount >= 1000 ? `${(video.viewsCount / 1000).toFixed(1)}K` : video.viewsCount} views</p>
                    </div>
                  </div>
                  <div className="p-3.5">
                    <p className="text-[14px] font-medium text-[#f5f5f5] truncate">{video.title}</p>
                  </div>
                </OpenPerformanceModalTrigger>
              ))}
            </div>
          ) : (
            <FeedEmptyState compact />
          )}
        </div>
      </section>

      <section className="relative min-w-0 overflow-hidden">
        <div className="w-full max-w-full mx-auto">
          <h2 className={`font-display text-[clamp(1.35rem,2.2vw,1.875rem)] font-semibold ${TITLE_TO_CONTENT} text-[#f5f5f5]`}>
            Why {APP_NAME}
          </h2>
          <div className="grid grid-cols-1 tablet:grid-cols-3 gap-5 laptop:gap-6">
            {WHY_ITEMS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-5 rounded-[18px] border border-white/[0.06]" style={{ background: 'rgba(15,15,15,0.5)' }}>
                <div className="w-10 h-10 rounded-[12px] bg-accent/20 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-accent" />
                </div>
                <h3 className="font-display text-[15px] font-semibold text-[#f5f5f5] mb-1.5">{title}</h3>
                <p className="text-[13px] leading-[1.5] text-[#9ca3af]">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative pb-24 md:pb-28 laptop:pb-32 min-w-0 overflow-hidden">
        <div className="w-full max-w-full mx-auto">
          <div className="rounded-[18px] p-8 md:p-10 text-center border border-white/[0.06]" style={{ background: 'rgba(15,15,15,0.6)', backdropFilter: 'blur(14px)' }}>
            <h2 className="font-display text-[1.5rem] md:text-[1.75rem] font-bold text-[#f5f5f5] mb-4">Ready to Take the Stage?</h2>
            <p className="text-[14px] md:text-[15px] leading-relaxed max-w-lg mx-auto mb-6 text-[#9ca3af]">
              {isAppMember ? 'Explore performances, discover talent, and share your own.' : 'Create your profile, upload your first performance, and let the world discover your talent.'}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {isAppMember ? (
                <>
                  <Link href="/feed" className="btn-primary inline-flex items-center gap-2">
                    <IconTrendingUp className="w-4 h-4 shrink-0" aria-hidden />
                    Go to feed
                  </Link>
                  <Link href="/explore" className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-xl font-semibold text-[15px] border border-white/15 text-[#f5f5f5]">
                    Explore
                  </Link>
                  <Link href="/upload" className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-xl border border-white/[0.12] text-[14px] font-medium text-[#f5f5f5]">
                    <IconUpload className="w-4 h-4 shrink-0" aria-hidden />
                    Upload
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/register" className="btn-primary">Create account</Link>
                  <Link href="/login" className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-xl font-semibold text-[15px] border border-white/15 text-[#f5f5f5]">Sign in</Link>
                  <a href="/api/auth/google" className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-xl border border-white/[0.12] text-[14px] font-medium text-[#f5f5f5]">
                    Continue with Google
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
