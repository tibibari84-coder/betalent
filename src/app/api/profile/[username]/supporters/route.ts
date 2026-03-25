import { NextResponse } from 'next/server';
import { getProfileByUsername } from '@/services/profile.service';
import { getCreatorTopSupporters } from '@/services/creator-top-supporters.service';

/**
 * GET /api/profile/[username]/supporters
 * Returns top supporters of this creator (by total coins sent). Data-only; ranking ready for UI.
 * Query: ?limit=20 (default 20, max 100)
 */
export async function GET(
  req: Request,
  { params }: { params: { username: string } }
) {
  try {
    const profile = await getProfileByUsername(params.username);
    if (!profile) {
      return NextResponse.json({ ok: false, message: 'Profile not found' }, { status: 404 });
    }
    const limit = Math.min(Number(new URL(req.url).searchParams.get('limit')) || 20, 100);
    const supporters = await getCreatorTopSupporters(profile.id, limit);
    return NextResponse.json({ ok: true, supporters });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
