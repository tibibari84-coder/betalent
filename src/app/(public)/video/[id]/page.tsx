import { notFound } from 'next/navigation';
import { getVideoById, getRelatedVideos, getVideoUserState } from '@/services/video.service';
import { getCurrentUser } from '@/lib/auth';
import { isDatabaseUnavailableError } from '@/lib/db-errors';
import VideoDetailClient from './VideoDetailClient';

interface Props {
  params: { id: string };
}

export default async function VideoPage({ params }: Props) {
  try {
  const currentUser = await getCurrentUser();
  const video = await getVideoById(params.id, currentUser?.id ?? null);
  if (!video || !video.videoUrl) notFound();
  const [related, userState] = await Promise.all([
    getRelatedVideos(video.categoryId, video.id, 6, currentUser?.id ?? null),
    getVideoUserState(video.id, video.creatorId, currentUser?.id ?? null),
  ]);
  const raw = video as typeof video & {
    creator: {
      id: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
      country: string | null;
      bio: string | null;
      isVerified: boolean;
      creatorTier: string;
      followersCount: number;
      profileVisibility?: unknown;
    };
    category: { id: string; name: string; slug: string };
    comments: Array<{ id: string; body: string; createdAt: Date; user: { username: string; displayName: string; avatarUrl: string | null; country: string | null } }>;
  };
  const { profileVisibility: _omitVis, ...creatorPublic } = raw.creator;
  const serialized = {
    ...video,
    videoUrl: video.videoUrl,
    createdAt: video.createdAt.toISOString(),
    creator: creatorPublic,
    category: raw.category,
    comments: raw.comments.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
    })),
  };
  return (
    <VideoDetailClient
      video={serialized}
      related={related}
      initialLiked={userState.liked}
      initialFollowing={userState.following}
      initialUserVote={userState.userVote}
    />
  );
  } catch (e) {
    if (isDatabaseUnavailableError(e)) {
      return (
        <div
          className="min-h-[50vh] flex items-center justify-center px-6 py-16"
          style={{ backgroundColor: '#0D0D0E' }}
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
