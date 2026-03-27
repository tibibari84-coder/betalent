import type { CommentReactionType } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type ReactionSummaryJson = Partial<Record<CommentReactionType, number>>;

/** Grouped counts per reaction for a set of comment ids (for API payloads). */
export async function reactionSummariesForCommentIds(
  ids: string[]
): Promise<Map<string, ReactionSummaryJson>> {
  if (ids.length === 0) return new Map();
  const rows = await prisma.commentLike.groupBy({
    by: ['commentId', 'reaction'],
    where: { commentId: { in: ids } },
    _count: { _all: true },
  });
  const map = new Map<string, ReactionSummaryJson>();
  for (const r of rows) {
    const cur = map.get(r.commentId) ?? {};
    cur[r.reaction] = r._count._all;
    map.set(r.commentId, cur);
  }
  return map;
}

export async function reactionSummaryForSingleComment(
  commentId: string
): Promise<ReactionSummaryJson> {
  const rows = await prisma.commentLike.groupBy({
    by: ['reaction'],
    where: { commentId },
    _count: { _all: true },
  });
  const out: ReactionSummaryJson = {};
  for (const r of rows) {
    out[r.reaction] = r._count._all;
  }
  return out;
}
