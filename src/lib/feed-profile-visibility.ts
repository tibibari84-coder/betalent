import { prisma } from '@/lib/prisma';
import { creatorDiscoverableToViewer } from '@/lib/discovery-visibility';
import { GLOBAL_VIDEO_FILTER } from '@/lib/video-global-filter';

/**
 * Drop videos whose creators block the viewer (same rules as {@link videoDiscoveryVisibilityWhere}).
 * Preserves input order.
 */
export async function filterVideoIdsForFeedViewer(
  videoIds: string[],
  viewerUserId: string | null | undefined
): Promise<string[]> {
  if (videoIds.length === 0) return [];
  const rows = await prisma.video.findMany({
    where: { id: { in: videoIds }, ...GLOBAL_VIDEO_FILTER },
    select: {
      id: true,
      creatorId: true,
      creator: { select: { profileVisibility: true } },
    },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const creatorIdsNeedingFollow = new Set<string>();
  for (const id of videoIds) {
    const r = byId.get(id);
    if (!r) continue;
    if (r.creator.profileVisibility === 'FOLLOWERS_ONLY' && r.creatorId !== viewerUserId) {
      creatorIdsNeedingFollow.add(r.creatorId);
    }
  }
  let followOk = new Set<string>();
  if (viewerUserId && creatorIdsNeedingFollow.size > 0) {
    const follows = await prisma.follow.findMany({
      where: {
        followerId: viewerUserId,
        creatorId: { in: Array.from(creatorIdsNeedingFollow) },
      },
      select: { creatorId: true },
    });
    followOk = new Set(follows.map((f) => f.creatorId));
  }
  return videoIds.filter((id) => {
    const r = byId.get(id);
    if (!r) return false;
    return creatorDiscoverableToViewer({
      profileVisibility: r.creator.profileVisibility,
      creatorId: r.creatorId,
      viewerUserId,
      viewerFollowsCreator: followOk.has(r.creatorId),
    });
  });
}
