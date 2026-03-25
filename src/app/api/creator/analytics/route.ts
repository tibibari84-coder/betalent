/**
 * GET /api/creator/analytics
 * Creator analytics: per-video stats, summary, trends.
 * Auth required. Returns own creator data only.
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getCreatorAnalytics } from '@/services/creator-analytics.service';

export async function GET() {
  try {
    const user = await requireAuth();
    const analytics = await getCreatorAnalytics(user.id);

    return NextResponse.json({
      ok: true,
      analytics: {
        ...analytics,
        perVideo: analytics.perVideo.map((v) => ({
          ...v,
          createdAt: v.createdAt.toISOString(),
        })),
        topPerforming: analytics.topPerforming.map((v) => ({
          ...v,
          createdAt: v.createdAt.toISOString(),
        })),
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ ok: false, message: 'Login required' }, { status: 401 });
    }
    console.error('[creator/analytics]', e);
    return NextResponse.json(
      { ok: false, message: 'Failed to load analytics' },
      { status: 500 }
    );
  }
}
