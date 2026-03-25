/**
 * BETALENT gift animation architecture.
 * Music-themed, premium, lightweight. See docs/GIFT-ANIMATION-ARCHITECTURE.md.
 */

export type AnimationIntensity = 'low' | 'medium' | 'high' | 'legendary';

export type AnimationScope = 'inline' | 'overlay' | 'fullscreen';
export type GiftCelebrationTier = 'bronze' | 'silver' | 'gold' | 'diamond';

export interface GiftAnimationConfig {
  /** Lookup key; matches Gift.animationType or slug */
  animationType: string;
  intensity: AnimationIntensity;
  /** Which contexts this animation is allowed to run in */
  scope: AnimationScope[];
  /** Future: id for optional short sound clip */
  soundId?: string | null;
  /** Suggested duration in ms; omit for intensity default */
  durationMs?: number | null;
}
