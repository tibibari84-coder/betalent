/**
 * GET /api/search – search creators, performances, and categories/styles.
 * Query: q (required), type (optional: creators | performances | all), limit (optional, default 20).
 * BETALENT-specific: TALENT_CATEGORIES, VOCAL_STYLES (singing, instrument, rap, gospel, performance, beatbox, radio-jingle, special-talent).
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { TALENT_CATEGORIES, VOCAL_STYLES } from '@/constants/categories';
import { CANONICAL_PUBLIC_VIDEO_WHERE } from '@/lib/video-moderation';
import { userDiscoveryVisibilityWhere, videoDiscoveryVisibilityWhere } from '@/lib/discovery-visibility';
import { isDatabaseUnavailableError } from '@/lib/db-errors';
import { stampApiResponse } from '@/lib/api-route-observe';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { RATE_LIMIT_SEARCH_PER_IP_PER_MINUTE } from '@/constants/api-rate-limits';

const READY_WHERE = CANONICAL_PUBLIC_VIDEO_WHERE;
const ROUTE_KEY = 'GET /api/search';

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, ' ');
}

export async function GET(req: Request) {
  const startedAt = performance.now();
  try {
    const ip = getClientIp(req);
    if (!(await checkRateLimit('search-ip', ip, RATE_LIMIT_SEARCH_PER_IP_PER_MINUTE, 60 * 1000))) {
      return stampApiResponse(
        NextResponse.json({ ok: false, message: 'Too many searches. Please slow down.' }, { status: 429 }),
        req,
        { routeKey: ROUTE_KEY, cachePolicy: 'personalized', startedAt }
      );
    }

    const viewer = await getCurrentUser();
    const viewerId = viewer?.id ?? null;
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim();
    const type = searchParams.get('type') ?? 'all';
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50);

    if (!q || q.length < 2) {
      return stampApiResponse(
        NextResponse.json({
          ok: true,
          creators: [],
          performances: [],
          categories: [],
          styles: [],
        }),
        req,
        { routeKey: ROUTE_KEY, cachePolicy: 'personalized', startedAt }
      );
    }

    const normalized = normalizeQuery(q);
    const searchPattern = `%${normalized}%`;
    const ilikePattern = `%${normalized.split('').join('%')}%`;

    const results: {
      creators: Array<{
        id: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
        country: string | null;
        talentType: string | null;
        followersCount: number;
      }>;
      performances: Array<{
        id: string;
        title: string;
        thumbnailUrl: string | null;
        viewsCount: number;
        likesCount: number;
        creator: { username: string; displayName: string; avatarUrl: string | null; country: string | null };
      }>;
      categories: Array<{ name: string; slug: string }>;
      styles: Array<{ name: string; slug: string }>;
    } = {
      creators: [],
      performances: [],
      categories: [],
      styles: [],
    };

    if (type === 'all' || type === 'creators') {
      const creators = await prisma.user.findMany({
        where: {
          AND: [
            userDiscoveryVisibilityWhere(viewerId),
            {
              OR: [
                { moderationStatus: null },
                { moderationStatus: { notIn: ['SUSPENDED', 'BANNED'] } },
              ],
            },
            {
              OR: [
                { username: { contains: normalized, mode: 'insensitive' } },
                { displayName: { contains: normalized, mode: 'insensitive' } },
              ],
            },
          ],
        },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          country: true,
          talentType: true,
          followersCount: true,
        },
        take: limit,
      });
      results.creators = creators;
    }

    if (type === 'all' || type === 'performances') {
      const performances = await prisma.video.findMany({
        where: {
          AND: [
            READY_WHERE,
            videoDiscoveryVisibilityWhere(viewerId),
            {
              OR: [
                { title: { contains: normalized, mode: 'insensitive' } },
                { description: { contains: normalized, mode: 'insensitive' } },
              ],
            },
          ],
        },
        orderBy: { viewsCount: 'desc' },
        take: limit,
        include: {
          creator: {
            select: { username: true, displayName: true, avatarUrl: true, country: true },
          },
        },
      });
      results.performances = performances.map((v) => ({
        id: v.id,
        title: v.title,
        thumbnailUrl: v.thumbnailUrl,
        viewsCount: v.viewsCount,
        likesCount: v.likesCount,
        creator: v.creator,
      }));
    }

    if (type === 'all' || type === 'categories') {
      const catMatch = TALENT_CATEGORIES.filter(
        (c) =>
          c.name.toLowerCase().includes(normalized) ||
          c.slug.toLowerCase().includes(normalized)
      );
      results.categories = catMatch.slice(0, 10).map((c) => ({ name: c.name, slug: c.slug }));

      const styleMatch = VOCAL_STYLES.filter(
        (s) =>
          s.slug &&
          (s.name.toLowerCase().includes(normalized) || s.slug.toLowerCase().includes(normalized))
      );
      results.styles = styleMatch.slice(0, 10).map((s) => ({ name: s.name, slug: s.slug }));
    }

    return stampApiResponse(
      NextResponse.json({
        ok: true,
        creators: results.creators,
        performances: results.performances,
        categories: results.categories,
        styles: results.styles,
      }),
      req,
      { routeKey: ROUTE_KEY, cachePolicy: 'personalized', startedAt }
    );
  } catch (e) {
    console.error('Search API error:', e);
    if (isDatabaseUnavailableError(e)) {
      return stampApiResponse(
        NextResponse.json({ ok: false, message: 'Service temporarily unavailable' }, { status: 503 }),
        req,
        { routeKey: ROUTE_KEY, cachePolicy: 'personalized', startedAt }
      );
    }
    return stampApiResponse(
      NextResponse.json({ ok: false, message: 'Search failed' }, { status: 500 }),
      req,
      { routeKey: ROUTE_KEY, cachePolicy: 'personalized', startedAt }
    );
  }
}
