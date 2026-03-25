/**
 * GET /api/recommendations/creators
 * Authenticated: suggested creators to follow (real ranking, no placeholders).
 * Query: limit (1–30, default 12), excludeIds (comma-separated creator ids — session dedupe).
 */
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getCreatorRecommendationsForViewer } from '@/services/creator-recommendations.service';

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const limitRaw = searchParams.get('limit');
    const excludeRaw = searchParams.get('excludeIds');
    const limit = limitRaw ? parseInt(limitRaw, 10) : 12;
    const excludeIds = excludeRaw
      ? excludeRaw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const creators = await getCreatorRecommendationsForViewer({
      viewerUserId: user.id,
      limit: Number.isFinite(limit) ? limit : 12,
      excludeCreatorIds: excludeIds,
    });

    return NextResponse.json({ ok: true, creators });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ ok: false, message: 'Login required' }, { status: 401 });
    }
    return NextResponse.json({ ok: false, message: 'Failed to load recommendations' }, { status: 500 });
  }
}
