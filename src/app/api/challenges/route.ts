import { NextResponse } from 'next/server';
import { listChallenges } from '@/services/challenge.service';

/**
 * GET /api/challenges
 * Query: limit=20
 * Returns public challenges (OPEN, VOTING, ENDED) for listing.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50);
    const challenges = await listChallenges(limit);
    return NextResponse.json({ ok: true, challenges });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
