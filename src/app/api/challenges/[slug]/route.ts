import { NextResponse } from 'next/server';
import { getChallengeBySlug } from '@/services/challenge.service';
import { COVER_CHALLENGE_STYLES } from '@/constants/cover-challenge';
import { isDatabaseUnavailableError } from '@/lib/db-errors';

/**
 * GET /api/challenges/[slug]
 * Returns challenge detail by slug (title, description, category, time window, prize, rules, entries count).
 */
export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const challenge = await getChallengeBySlug(slug);
    if (!challenge) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }
    const rules = challenge.rules as string[] | null;
    return NextResponse.json({
      ok: true,
      challenge: {
        id: challenge.id,
        slug: challenge.slug,
        title: challenge.title,
        description: challenge.description,
        categoryId: challenge.categoryId,
        category: challenge.category,
        status: challenge.status,
        startAt: challenge.startAt,
        endAt: challenge.endAt,
        entryOpenAt: challenge.entryOpenAt,
        entryCloseAt: challenge.entryCloseAt,
        votingCloseAt: challenge.votingCloseAt,
        prizeDescription: challenge.prizeDescription,
        prizeCoins: challenge.prizeCoins,
        rules: rules ?? [],
        entriesCount: challenge._count.entries,
        artistTheme: challenge.artistTheme,
        maxDurationSec: challenge.maxDurationSec,
        liveEventAt: challenge.liveEventAt,
        liveStartAt: challenge.liveStartAt,
        windows: challenge.windows ?? [],
        winners: challenge.winners ?? [],
        availableStyles: challenge.artistTheme ? COVER_CHALLENGE_STYLES : null,
      },
    });
  } catch (e) {
    if (isDatabaseUnavailableError(e)) {
      return NextResponse.json({ ok: false, message: 'Service temporarily unavailable' }, { status: 503 });
    }
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
