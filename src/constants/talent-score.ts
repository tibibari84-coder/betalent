/**
 * Talent Score: weighted formula for performance appreciation.
 * score = avgVote*0.6 + likeWeight*0.2 + commentWeight*0.1 + watchWeight*0.1
 * All components 0–10 scale; result rounded to 1 decimal.
 */

export const TALENT_SCORE_MIN_VOTES = 5;

export const TALENT_SCORE_WEIGHTS = {
  avgVote: 0.6,
  likeWeight: 0.2,
  commentWeight: 0.1,
  watchWeight: 0.1,
} as const;

/** Normalize likes to 0–10 (e.g. 50 likes → 10). */
export const TALENT_SCORE_LIKES_SCALE = 5;
/** Normalize comments to 0–10 (e.g. 25 comments → 10). */
export const TALENT_SCORE_COMMENTS_SCALE = 2.5;
/** Normalize views to 0–10 (e.g. 1000 views → 10). */
export const TALENT_SCORE_VIEWS_SCALE = 100;

export function normalizeToTen(value: number, scale: number): number {
  if (scale <= 0) return 0;
  return Math.min(10, value / scale);
}
