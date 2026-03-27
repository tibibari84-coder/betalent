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
import ProfileRankingBadge from '@/components/leaderboard/ProfileRankingBadge';
import ProfileSupportSection from './ProfileSupportSection';
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
  /** Do not show User.talentType on profile — it is not edited in Settings and old seeds used category names like "Radio Jingle" as fake identity. */
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
    /** No talent category on profile until we have a Settings-backed niche field. */
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
      visibility: (v as { visibility?: 'PUBLIC' | 'PRIVATE' }).visibility ?? 'PUBLIC',
      commentPermission: (v as { commentPermission?: 'EVERYONE' | 'FOLLOWERS' | 'FOLLOWING' | 'OFF' }).commentPermission ?? 'EVERYONE',
    };
  });

  const scoredVideos = profileVideos.filter((v) => v.talentScore != null);
  const averageTalentScore =
    scoredVideos.length > 0
      ? scoredVideos.reduce((sum, v) => sum + (v.talentScore ?? 0), 0) / scoredVideos.length
      : null;


  return (
    <div
      className="w-full min-h-screen pb-24 md:pb-8 min-w-0 overflow-x-hidden"
      style={{
        background:
          'radial-gradient(circle at 0% -20%, rgba(196,18,47,0.32), transparent 60%), radial-gradient(circle at 100% 120%, rgba(196,18,47,0.22), transparent 60%), #05060a',
      }}
    >
      <ProfileTopBar
        username={profile.username}
        displayName={profile.displayName ?? profile.username}
        isOwner={isOwner}
        showBack={!isOwner}
      />
      <div className="w-full min-w-0 max-w-[1040px] mx-auto px-3 sm:px-4 py-4 md:py-6">
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

        <div className="mt-4 md:mt-5 w-full">
          <ProfileStatsBar
            followers={truthfulStats.followersCount}
            following={truthfulStats.followingCount}
            totalLikes={truthfulStats.totalLikesOnVideos}
            totalViews={truthfulStats.totalViewsOnVideos}
            votes={truthfulStats.totalVotesOnVideos}
            averageTalentScore={averageTalentScore}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-3 justify-center md:justify-start">
          <ProfileRankingBadge username={username} countryCode={profile.country} />
        </div>

        <div className="mt-5 md:mt-6">
          <ProfileSupportSection username={username} />
        </div>

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
        <div
          className="w-full min-h-[50vh] flex items-center justify-center px-6 py-16"
          style={{ backgroundColor: '#05060a' }}
        >
          <p className="text-center text-[15px] text-text-secondary max-w-md" role="alert">
            Service temporarily unavailable. Please try again shortly.
          </p>
        </div>
      );
    }
    throw e;
  }
}
