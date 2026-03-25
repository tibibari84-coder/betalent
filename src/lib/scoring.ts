export interface VideoScoreInput {
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  coinsCount: number;
}

const WEIGHTS = {
  views: 1,
  likes: 3,
  comments: 4,
  coins: 5,
} as const;

export function calculateVideoScore(input: VideoScoreInput): number {
  const { viewsCount, likesCount, commentsCount, coinsCount } = input;
  return (
    viewsCount * WEIGHTS.views +
    likesCount * WEIGHTS.likes +
    commentsCount * WEIGHTS.comments +
    coinsCount * WEIGHTS.coins
  );
}

export function recalculateVideoScore(input: VideoScoreInput): number {
  return calculateVideoScore(input);
}
