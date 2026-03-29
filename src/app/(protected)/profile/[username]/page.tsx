import { notFound } from 'next/navigation';
import { getCountryName } from '@/lib/countries';
import { getCurrentUser } from '@/lib/auth';
import {
  getProfileByUsername,
  getProfileVideos,
  getProfileLikedVideos,
  getProfileChallengeEntries,
  getProfileTruthfulStats,
} from '@/services/profile.service';
import { prisma } from '@/lib/prisma';
import { CREATOR_TIER_LABELS } from '@/constants/app';
import ProfileTopBar from './ProfileTopBar';
import ProfileHeader from './ProfileHeader';
import ProfileStatsBar from './ProfileStatsBar';
import ProfileContent from './ProfileContent';
import { sanitizeProfileBioForDisplay } from '@/lib/profile-display';
import { canViewerAccessProfile } from '@/services/profile-access.service';
import { isDatabaseUnavailableError } from '@/lib/db-errors';

interface Props {
  params: { username: string };
}

/**
 * Profile page – server component, same access rules as GET /api/profile/[username].
 * Route: /profile/[username] e.g. /profile/maria-lopez
 */
export default async function ProfilePage({ params }: Props) {
  try {
    const { username } = params;
    const [profile, currentUser] = await Promise.all([
      getProfileByUsername(username),
      getCurrentUser(),
    ]);
    if (!profile) notFound();

    const allowed = await canViewerAccessProfile({
      creatorId: profile.id,
      viewerUserId: currentUser?.id ?? null,
      profileVisibility: profile.profileVisibility,
    });
    if (!allowed) notFound();

    const isOwner = currentUser?.id === profile.id;
    const [profileVideos, follow, likedVideos, challenges, truthfulStats] = await Promise.all([
      getProfileVideos(profile.id, currentUser?.id ?? null),
      currentUser
        ? prisma.follow.findUnique({
            where: {
              followerId_creatorId: { followerId: currentUser.id, creatorId: profile.id },
            },
          })
        : null,
      isOwner && currentUser ? getProfileLikedVideos(currentUser.id) : [],
      isOwner && currentUser ? getProfileChallengeEntries(currentUser.id) : [],
      getProfileTruthfulStats(profile.id),
    ]);

    const countryName = profile.country ? getCountryName(profile.country) : null;
    const subtitle = countryName || null;

    const displayBio = sanitizeProfileBioForDisplay(profile.bio);

    const memberSinceLabel =
      profile.createdAt != null
        ? new Date(profile.createdAt).toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
          })
        : null;

    const joinedDateFull =
      profile.createdAt != null
        ? new Date(profile.createdAt).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })
        : null;

    const about = {
      country: countryName,
      talentCategory: null as string | null,
      joinedDate: joinedDateFull,
      story: displayBio,
    };

    const videos = profileVideos.map((v) => {
      const creator = v.creator as { creatorTier?: keyof typeof CREATOR_TIER_LABELS };
      const badge =
        creator?.creatorTier && creator.creatorTier in CREATOR_TIER_LABELS
          ? CREATOR_TIER_LABELS[creator.creatorTier]
          : null;
      return {
        id: v.id,
        title: v.title,
        badge,
        likes: v.likesCount,
        views: v.viewsCount,
        votes: v.votesCount,
        talentScore: v.talentScore ?? null,
        thumbnailUrl: v.thumbnailUrl ?? null,
        processingLabel: (v as { processingLabel?: string | null }).processingLabel ?? null,
        creatorId: v.creatorId,
        visibility: (v as { visibility?: import('@prisma/client').VideoVisibility }).visibility ?? 'PUBLIC',
        commentPermission:
          (v as { commentPermission?: 'EVERYONE' | 'FOLLOWERS' | 'FOLLOWING' | 'OFF' }).commentPermission ??
          'EVERYONE',
      };
    });

    return (
      <div className="w-full min-h-screen min-w-0 overflow-x-hidden bg-[#050505] pb-[calc(5.25rem+env(safe-area-inset-bottom))] md:pb-8">
        <ProfileTopBar
          username={profile.username}
          displayName={profile.displayName ?? profile.username}
          isOwner={isOwner}
          showBack={!isOwner}
        />
        <div className="mx-auto w-full min-w-0 max-w-md">
          <ProfileHeader
            displayName={profile.displayName ?? profile.username}
            username={profile.username}
            countryCode={profile.country}
            subtitle={subtitle}
            bio={displayBio}
            avatarUrl={profile.avatarUrl}
            isVerified={profile.isVerified ?? false}
            verificationLevel={profile.verificationLevel}
            creatorId={profile.id}
            initialFollowing={!!follow}
            memberSinceLabel={memberSinceLabel}
            isOwner={isOwner}
          />

          <ProfileStatsBar
            performancesCount={videos.length}
            followers={truthfulStats.followersCount}
            following={truthfulStats.followingCount}
            totalViews={truthfulStats.totalViewsOnVideos}
            totalLikes={truthfulStats.totalLikesOnVideos}
            votes={truthfulStats.totalVotesOnVideos}
          />

          <ProfileContent
            videos={videos}
            likedVideos={likedVideos}
            challenges={challenges}
            about={about}
            isOwner={isOwner}
            profileUserId={profile.id}
          />
        </div>
      </div>
    );
  } catch (e) {
    if (isDatabaseUnavailableError(e)) {
      return (
        <div className="flex w-full flex-col items-center bg-[#050505] px-5 py-10">
          <p className="max-w-[260px] text-center text-[13px] leading-relaxed text-white/48" role="alert">
            Service temporarily unavailable. Try again shortly.
          </p>
        </div>
      );
    }
    throw e;
  }
}
