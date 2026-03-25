import type { ProfileVisibilityLevel } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function canViewerAccessProfile(params: {
  creatorId: string;
  viewerUserId: string | null | undefined;
  profileVisibility: ProfileVisibilityLevel;
}): Promise<boolean> {
  const { creatorId, viewerUserId, profileVisibility } = params;
  if (profileVisibility === 'PUBLIC') return true;
  if (!viewerUserId) return false;
  if (viewerUserId === creatorId) return true;
  if (profileVisibility === 'PRIVATE') return false;
  const f = await prisma.follow.findUnique({
    where: { followerId_creatorId: { followerId: viewerUserId, creatorId } },
  });
  return !!f;
}
