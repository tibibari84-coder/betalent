/**
 * GET /api/leaderboard
 * Global Leaderboard API: creators or performances, global or by country, with time period.
 * Query: scope=global|country, target=creator|performance, period=daily|weekly|monthly|all_time, countryCode=XX (required if scope=country)
 */

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getCreatorLeaderboard } from '@/services/creator-leaderboard.service';
import { getPerformanceLeaderboard } from '@/services/performance-leaderboard.service';
import { getFlagEmoji } from '@/lib/countries';
import { isDatabaseUnavailableError } from '@/lib/db-errors';
import { stampApiResponse } from '@/lib/api-route-observe';

const ROUTE_KEY = 'GET /api/leaderboard';
import {
  LEADERBOARD_SCOPES,
  LEADERBOARD_TARGETS,
  LEADERBOARD_PERIODS,
  type LeaderboardScope,
  type LeaderboardTarget,
  type LeaderboardPeriod,
} from '@/constants/leaderboard-global';

const VALID_SCOPES = new Set<LeaderboardScope>(LEADERBOARD_SCOPES);
const VALID_TARGETS = new Set<LeaderboardTarget>(LEADERBOARD_TARGETS);
const VALID_PERIODS = new Set<LeaderboardPeriod>(LEADERBOARD_PERIODS);

/** Map API period to creator-leaderboard type (all_time -> alltime). */
function toCreatorType(period: LeaderboardPeriod): 'daily' | 'weekly' | 'monthly' | 'alltime' {
  if (period === 'all_time') return 'alltime';
  return period;
}

export async function GET(req: Request) {
  const startedAt = performance.now();
  try {
    const viewer = await getCurrentUser();
    const viewerId = viewer?.id ?? null;
    const { searchParams } = new URL(req.url);
    const scope = (searchParams.get('scope') ?? 'global') as LeaderboardScope;
    const target = (searchParams.get('target') ?? 'creator') as LeaderboardTarget;
    const periodParam = (searchParams.get('period') ?? 'weekly') as LeaderboardPeriod;
    const period: LeaderboardPeriod = VALID_PERIODS.has(periodParam) ? periodParam : 'weekly';
    const countryCode = searchParams.get('countryCode')?.trim().toUpperCase() ?? null;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);
    const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10));

    if (!VALID_SCOPES.has(scope)) {
      return NextResponse.json(
        { ok: false, message: 'Invalid scope. Use global or country.' },
        { status: 400 }
      );
    }
    if (!VALID_TARGETS.has(target)) {
      return NextResponse.json(
        { ok: false, message: 'Invalid target. Use creator or performance.' },
        { status: 400 }
      );
    }
    if (scope === 'country' && !countryCode) {
      return NextResponse.json(
        { ok: false, message: 'countryCode is required when scope=country.' },
        { status: 400 }
      );
    }

    const effectiveCountry = scope === 'country' ? countryCode : null;

    if (target === 'creator') {
      const result = await getCreatorLeaderboard({
        type: toCreatorType(period),
        countryCode: effectiveCountry,
        limit,
        offset,
        viewerUserId: viewerId,
      });
      const items = result.entries.map((e) => ({
        rank: e.rank,
        creatorId: e.creatorId,
        username: e.username,
        displayName: e.displayName,
        avatarUrl: e.avatarUrl,
        country: e.country,
        countryFlag: e.country ? getFlagEmoji(e.country) : '',
        isVerified: e.isVerified,
        score: e.score,
      }));
      return stampApiResponse(
        NextResponse.json({
          ok: true,
          target: 'creator',
          scope,
          period,
          countryCode: effectiveCountry,
          entries: items,
        }),
        req,
        { routeKey: ROUTE_KEY, cachePolicy: 'personalized', startedAt }
      );
    }

    const result = await getPerformanceLeaderboard({
      period,
      countryCode: effectiveCountry,
      limit,
      offset,
      viewerUserId: viewerId,
    });
    const items = result.entries.map((e) => ({
      rank: e.rank,
      videoId: e.videoId,
      title: e.title,
      thumbnailUrl: e.thumbnailUrl,
      videoUrl: e.videoUrl,
      creatorId: e.creatorId,
      creatorUsername: e.creatorUsername,
      creatorDisplayName: e.creatorDisplayName,
      creatorAvatarUrl: e.creatorAvatarUrl,
      creatorCountry: e.creatorCountry,
      creatorCountryFlag: e.creatorCountry ? getFlagEmoji(e.creatorCountry) : '',
      categoryName: e.categoryName,
      categorySlug: e.categorySlug,
      score: e.score,
      talentScore: e.talentScore,
      viewsCount: e.viewsCount,
      likesCount: e.likesCount,
      commentsCount: e.commentsCount,
      votesCount: e.votesCount,
    }));
    return stampApiResponse(
      NextResponse.json({
        ok: true,
        target: 'performance',
        scope,
        period,
        countryCode: result.countryCode,
        entries: items,
      }),
      req,
      { routeKey: ROUTE_KEY, cachePolicy: 'personalized', startedAt }
    );
  } catch (e) {
    console.error('[leaderboard]', e);
    if (isDatabaseUnavailableError(e)) {
      return stampApiResponse(
        NextResponse.json({ ok: false, message: 'Service temporarily unavailable' }, { status: 503 }),
        req,
        { routeKey: ROUTE_KEY, cachePolicy: 'personalized', startedAt }
      );
    }
    return stampApiResponse(
      NextResponse.json({ ok: false, message: 'Server error' }, { status: 500 }),
      req,
      { routeKey: ROUTE_KEY, cachePolicy: 'personalized', startedAt }
    );
  }
}
