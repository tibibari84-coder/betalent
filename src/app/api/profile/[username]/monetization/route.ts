import { NextResponse } from 'next/server';
import { getProfileByUsername } from '@/services/profile.service';
import { getCreatorMonetizationSummary } from '@/services/creator-monetization.service';

/**
 * GET /api/profile/[username]/monetization
 * Returns creator monetization counters for profile or leaderboard display.
 */
export async function GET(
  _req: Request,
  { params }: { params: { username: string } }
) {
  try {
    const profile = await getProfileByUsername(params.username);
    if (!profile) {
      return NextResponse.json({ ok: false, message: 'Profile not found' }, { status: 404 });
    }
    const monetization = await getCreatorMonetizationSummary(profile.id);
    return NextResponse.json({ ok: true, monetization });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
