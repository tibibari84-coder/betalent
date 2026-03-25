import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getOrCreateWallet } from '@/services/wallet.service';
import { getCountryName, getFlagEmoji } from '@/lib/countries';
import { isDatabaseUnavailableError } from '@/lib/db-errors';

export async function GET() {
  try {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    return NextResponse.json(
      { ok: false, authenticated: false, message: 'Unauthorized' },
      { status: 401 }
    );
  }

  const userRow = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      country: true,
      city: true,
      talentType: true,
      creatorTier: true,
      rankProgress: true,
      uploadLimitSec: true,
      followersCount: true,
      followingCount: true,
      videosCount: true,
      totalViews: true,
      totalCoinsReceived: true,
      isVerified: true,
      emailVerifiedAt: true,
      googleId: true,
      phoneE164: true,
      phoneVerifiedAt: true,
      twoFactorEnabled: true,
      twoFactorMethod: true,
      preferredLocale: true,
      profileVisibility: true,
      defaultCommentPermission: true,
      allowVotesOnPerformances: true,
      notifyChallenges: true,
      notifyVotes: true,
      notifyFollowers: true,
      notifyComments: true,
      notifyAnnouncements: true,
      creatorVerification: {
        where: { verificationStatus: 'APPROVED' },
        select: { verificationLevel: true },
      },
    },
  });
  if (!userRow) {
    return NextResponse.json(
      { ok: false, authenticated: true, message: 'User not found', staleSession: true },
      { status: 404 }
    );
  }
  const { creatorVerification, ...rest } = userRow;
  const verificationLevel = creatorVerification?.verificationLevel ?? null;
  const {
    emailVerifiedAt,
    googleId,
    phoneE164,
    phoneVerifiedAt,
    twoFactorEnabled,
    twoFactorMethod,
    profileVisibility,
    defaultCommentPermission,
    allowVotesOnPerformances,
    notifyChallenges,
    notifyVotes,
    notifyFollowers,
    notifyComments,
    notifyAnnouncements,
    ...profileRest
  } = rest;

  const user = {
    ...profileRest,
    googleLinked: !!googleId,
    countryCode: profileRest.country,
    countryName: getCountryName(profileRest.country),
    countryFlag: getFlagEmoji(profileRest.country),
    verificationLevel,
    /** You control this inbox — not legal/creator identity. */
    emailOwnershipVerified: !!emailVerifiedAt,
    /** Stronger sign-in protection (authenticator app). */
    twoFactorEnabled,
    twoFactorMethod,
    /** Future: proves control of a phone number; SMS not shipped in product UI. */
    phoneE164,
    phoneVerifiedAt,
    preferences: {
      profileVisibility,
      defaultCommentPermission,
      allowVotesOnPerformances,
      notifyChallenges,
      notifyVotes,
      notifyFollowers,
      notifyComments,
      notifyAnnouncements,
    },
  };

  const wallet = await getOrCreateWallet(user.id);

  return NextResponse.json({
    ok: true,
    authenticated: true,
    user: { ...user, wallet },
  });
  } catch (e) {
    if (isDatabaseUnavailableError(e)) {
      return NextResponse.json(
        { ok: false, authenticated: false, message: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { ok: false, authenticated: false, message: 'Failed to load account' },
      { status: 500 }
    );
  }
}
