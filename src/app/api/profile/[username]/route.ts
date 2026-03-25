import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getProfileByUsername, getProfileVideos, getProfileTruthfulStats } from '@/services/profile.service';
import { sanitizeProfileBioForDisplay } from '@/lib/profile-display';
import { getCreatorMonetizationSummary } from '@/services/creator-monetization.service';
import { canViewerAccessProfile } from '@/services/profile-access.service';
import { isDatabaseUnavailableError } from '@/lib/db-errors';

export async function GET(
  _req: Request,
  { params }: { params: { username: string } }
) {
  try {
    const [profile, currentUser] = await Promise.all([
      getProfileByUsername(params.username),
      getCurrentUser(),
    ]);
    if (!profile) {
      return NextResponse.json({ ok: false, message: 'Profile not found' }, { status: 404 });
    }
    const { profileVisibility, ...publicProfile } = profile as typeof profile & {
      profileVisibility: import('@prisma/client').ProfileVisibilityLevel;
    };
    const allowed = await canViewerAccessProfile({
      creatorId: publicProfile.id,
      viewerUserId: currentUser?.id ?? null,
      profileVisibility,
    });
    if (!allowed) {
      return NextResponse.json({ ok: false, message: 'Profile not found' }, { status: 404 });
    }
    const [videos, monetization, truthfulStats] = await Promise.all([
      getProfileVideos(publicProfile.id, currentUser?.id ?? null),
      getCreatorMonetizationSummary(publicProfile.id),
      getProfileTruthfulStats(publicProfile.id),
    ]);
    const safeBio = sanitizeProfileBioForDisplay(publicProfile.bio);
    return NextResponse.json({
      ok: true,
      profile: {
        ...publicProfile,
        bio: safeBio,
        talentType: null,
        monetization,
        /** Relation-derived + video sum — use these for display, not stale User.* denormalized fields */
        displayStats: truthfulStats,
      },
      videos,
    });
  } catch (e) {
    if (isDatabaseUnavailableError(e)) {
      return NextResponse.json({ ok: false, message: 'Service temporarily unavailable' }, { status: 503 });
    }
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
