import type { CommentReactionTypeKey } from '@/constants/comment-reactions';

export interface CommentItem {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  country?: string;
  timestamp: string;
  body: string;
  likeCount?: number;
  replyCount?: number;
  verified?: boolean;
  verificationLevel?: string | null;
  parentUsername?: string;
  replies?: CommentItem[];
  isDeleted?: boolean;
  canDelete?: boolean;
  isCreator?: boolean;
  likedByMe?: boolean;
  /** Current viewer's reaction, if any */
  myReaction?: CommentReactionTypeKey | string | null;
  /** Counts per reaction type */
  reactionSummary?: Record<string, number>;
  userId?: string;
}

export type ApiComment = CommentItem & {
  createdAt?: string;
  parentId?: string | null;
};

export type CommentPatch = Partial<
  Pick<
    CommentItem,
    'likedByMe' | 'myReaction' | 'reactionSummary' | 'likeCount' | 'isDeleted' | 'body' | 'canDelete'
  >
>;
