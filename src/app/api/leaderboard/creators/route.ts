import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getCreatorLeaderboard } from '@/services/creator-leaderboard.service';
import { getFlagEmoji } from '@/lib/countries';
import { isDatabaseUnavailableError } from '@/lib/db-errors';
import type { CreatorLeaderboardType } from '@/constants/creator-leaderboard';

export interface CreatorLeaderboardItemDTO {
  rank: number;
  creatorId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  country: string | null;
  countryFlag: string;
  isVerified: boolean;
  score: number;
}

/**
 * GET /api/leaderboard/creators
 * Query: type=daily|weekly|monthly|alltime, categorySlug=..., categoryId=..., limit=50, offset=0
 * Returns ranked list of creators by influence score.
 */
export async function GET(req: Request) {
  try {
    const viewer = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const typeParam = searchParams.get('type') as CreatorLeaderboardType | null;
    const type =
      typeParam && ['daily', 'weekly', 'monthly', 'alltime'].includes(typeParam)
        ? typeParam
        : 'weekly';
    const categoryId = searchParams.get('categoryId') ?? undefined;
    const categorySlug = searchParams.get('categorySlug') ?? undefined;
    const limit = Math.min(
      parseInt(searchParams.get('limit') ?? '50', 10),
      100
    );
    const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10));

    const result = await getCreatorLeaderboard({
      type,
      categoryId: categoryId || null,
      categorySlug: categorySlug || null,
      limit,
      offset,
      viewerUserId: viewer?.id ?? null,
    });

    const items: CreatorLeaderboardItemDTO[] = result.entries.map((e) => ({
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

    return NextResponse.json({
      ok: true,
      entries: items,
      type: result.type,
      categoryId: result.categoryId,
      categorySlug: result.categorySlug,
    });
  } catch (e) {
    if (isDatabaseUnavailableError(e)) {
      return NextResponse.json({ ok: false, message: 'Service temporarily unavailable' }, { status: 503 });
    }
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
