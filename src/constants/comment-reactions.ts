/** Mirrors prisma `CommentReactionType` — keep in sync with schema. */
export const COMMENT_REACTION_TYPES = [
  'LIKE',
  'LOVE',
  'CARE',
  'HAHA',
  'WOW',
  'SAD',
  'ANGRY',
] as const;

export type CommentReactionTypeKey = (typeof COMMENT_REACTION_TYPES)[number];

export const COMMENT_REACTION_EMOJI: Record<CommentReactionTypeKey, string> = {
  LIKE: '👍',
  LOVE: '❤️',
  CARE: '🤗',
  HAHA: '😂',
  WOW: '😮',
  SAD: '😢',
  ANGRY: '😠',
};

export const COMMENT_REACTION_LABEL: Record<CommentReactionTypeKey, string> = {
  LIKE: 'Like',
  LOVE: 'Love',
  CARE: 'Care',
  HAHA: 'Haha',
  WOW: 'Wow',
  SAD: 'Sad',
  ANGRY: 'Angry',
};

export function isCommentReactionType(v: string): v is CommentReactionTypeKey {
  return (COMMENT_REACTION_TYPES as readonly string[]).includes(v);
}
