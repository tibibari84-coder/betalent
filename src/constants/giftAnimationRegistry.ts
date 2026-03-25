/**
 * Gift animation config registry.
 * Maps slug or animationType to config. Used by GiftCelebration to choose animation.
 * See docs/GIFT-ANIMATION-ARCHITECTURE.md.
 */

import type { GiftAnimationConfig } from '@/types/gift-animation';

const REGISTRY: Record<string, GiftAnimationConfig> = {
  'music-note': {
    animationType: 'float',
    intensity: 'low',
    scope: ['inline'],
    soundId: null,
    durationMs: 1200,
  },
  microphone: {
    animationType: 'spotlight',
    intensity: 'medium',
    scope: ['inline', 'overlay'],
    soundId: null,
    durationMs: 1500,
  },
  headphones: {
    animationType: 'pulse',
    intensity: 'low',
    scope: ['inline'],
    durationMs: 1000,
  },
  'drum-beat': {
    animationType: 'bounce',
    intensity: 'medium',
    scope: ['inline', 'overlay'],
    durationMs: 1400,
  },
  piano: {
    animationType: 'luminous-panel',
    intensity: 'medium',
    scope: ['inline', 'overlay'],
    soundId: null,
    durationMs: 1800,
  },
  'golden-score': {
    animationType: 'shine',
    intensity: 'high',
    scope: ['inline', 'overlay'],
    durationMs: 2000,
  },
  'platinum-record': {
    animationType: 'legendary',
    intensity: 'legendary',
    scope: ['inline', 'overlay', 'fullscreen'],
    soundId: null,
    durationMs: 2500,
  },
  // Fallbacks for animationType used as key
  float: {
    animationType: 'float',
    intensity: 'low',
    scope: ['inline'],
    durationMs: 1200,
  },
  sparkle: {
    animationType: 'sparkle',
    intensity: 'low',
    scope: ['inline'],
    durationMs: 1100,
  },
  pulse: {
    animationType: 'pulse',
    intensity: 'low',
    scope: ['inline'],
    durationMs: 1000,
  },
  bounce: {
    animationType: 'bounce',
    intensity: 'medium',
    scope: ['inline', 'overlay'],
    durationMs: 1400,
  },
  glow: {
    animationType: 'luminous-panel',
    intensity: 'medium',
    scope: ['inline', 'overlay'],
    durationMs: 1800,
  },
  shine: {
    animationType: 'shine',
    intensity: 'high',
    scope: ['inline', 'overlay'],
    durationMs: 2000,
  },
  legendary: {
    animationType: 'legendary',
    intensity: 'legendary',
    scope: ['inline', 'overlay', 'fullscreen'],
    durationMs: 2500,
  },
  // New gift slugs – reuse animation configs
  spotlight: { animationType: 'spotlight', intensity: 'medium', scope: ['inline', 'overlay'], durationMs: 1500 },
  'spotlight-pro': { animationType: 'spotlight', intensity: 'medium', scope: ['inline', 'overlay'], durationMs: 1500 },
  'spotlight-elite': { animationType: 'legendary', intensity: 'legendary', scope: ['inline', 'overlay', 'fullscreen'], durationMs: 2500 },
  'stage-lights': { animationType: 'spotlight', intensity: 'medium', scope: ['inline', 'overlay'], durationMs: 1500 },
  'curtain-call': { animationType: 'luminous-panel', intensity: 'medium', scope: ['inline', 'overlay'], durationMs: 1800 },
  encore: { animationType: 'bounce', intensity: 'medium', scope: ['inline', 'overlay'], durationMs: 1400 },
  gramophone: { animationType: 'pulse', intensity: 'low', scope: ['inline'], durationMs: 1000 },
  'treble-clef': { animationType: 'float', intensity: 'low', scope: ['inline'], durationMs: 1200 },
  'bass-clef': { animationType: 'float', intensity: 'low', scope: ['inline'], durationMs: 1200 },
  metronome: { animationType: 'bounce', intensity: 'medium', scope: ['inline', 'overlay'], durationMs: 1400 },
  'sheet-music': { animationType: 'float', intensity: 'low', scope: ['inline'], durationMs: 1200 },
  'conductor-baton': { animationType: 'float', intensity: 'low', scope: ['inline'], durationMs: 1200 },
  'diamond-star': { animationType: 'shine', intensity: 'high', scope: ['inline', 'overlay'], durationMs: 2000 },
  'golden-mic': { animationType: 'shine', intensity: 'high', scope: ['inline', 'overlay'], durationMs: 2000 },
  'silver-record': { animationType: 'shine', intensity: 'high', scope: ['inline', 'overlay'], durationMs: 2000 },
  'gold-record': { animationType: 'shine', intensity: 'high', scope: ['inline', 'overlay'], durationMs: 2000 },
  grammy: { animationType: 'luminous-panel', intensity: 'medium', scope: ['inline', 'overlay'], durationMs: 1800 },
  oscar: { animationType: 'shine', intensity: 'high', scope: ['inline', 'overlay'], durationMs: 2000 },
  trophy: { animationType: 'luminous-panel', intensity: 'medium', scope: ['inline', 'overlay'], durationMs: 1800 },
  medal: { animationType: 'shine', intensity: 'high', scope: ['inline', 'overlay'], durationMs: 2000 },
  diamond: { animationType: 'shine', intensity: 'high', scope: ['inline', 'overlay'], durationMs: 2000 },
  'crystal-ball': { animationType: 'luminous-panel', intensity: 'medium', scope: ['inline', 'overlay'], durationMs: 1800 },
  'red-carpet': { animationType: 'luminous-panel', intensity: 'medium', scope: ['inline', 'overlay'], durationMs: 1800 },
  'grand-piano': { animationType: 'luminous-panel', intensity: 'medium', scope: ['inline', 'overlay'], durationMs: 1800 },
  'diamond-record': { animationType: 'legendary', intensity: 'legendary', scope: ['inline', 'overlay', 'fullscreen'], durationMs: 2500 },
  'betalent-crown': { animationType: 'legendary', intensity: 'legendary', scope: ['inline', 'overlay', 'fullscreen'], durationMs: 2500 },
  'hall-of-fame': { animationType: 'legendary', intensity: 'legendary', scope: ['inline', 'overlay', 'fullscreen'], durationMs: 2500 },
  superstar: { animationType: 'legendary', intensity: 'legendary', scope: ['inline', 'overlay', 'fullscreen'], durationMs: 2500 },
  legend: { animationType: 'legendary', intensity: 'legendary', scope: ['inline', 'overlay', 'fullscreen'], durationMs: 2500 },
  icon: { animationType: 'legendary', intensity: 'legendary', scope: ['inline', 'overlay', 'fullscreen'], durationMs: 2500 },
  champion: { animationType: 'legendary', intensity: 'legendary', scope: ['inline', 'overlay', 'fullscreen'], durationMs: 2500 },
  mogul: { animationType: 'legendary', intensity: 'legendary', scope: ['inline', 'overlay', 'fullscreen'], durationMs: 2500 },
  'ultimate-support': { animationType: 'legendary', intensity: 'legendary', scope: ['inline', 'overlay', 'fullscreen'], durationMs: 2500 },
  // New curated catalog entries
  applause: { animationType: 'float', intensity: 'low', scope: ['inline'], durationMs: 1200 },
  'stage-hand': { animationType: 'float', intensity: 'low', scope: ['inline'], durationMs: 1200 },
  bravo: { animationType: 'float', intensity: 'low', scope: ['inline'], durationMs: 1200 },
  'follow-spot': { animationType: 'spotlight', intensity: 'medium', scope: ['inline', 'overlay'], durationMs: 1500 },
  'thunderous-applause': { animationType: 'bounce', intensity: 'medium', scope: ['inline', 'overlay'], durationMs: 1600 },
  'rising-star': { animationType: 'shine', intensity: 'high', scope: ['inline', 'overlay'], durationMs: 2000 },
  'star-burst': { animationType: 'shine', intensity: 'high', scope: ['inline', 'overlay'], durationMs: 2000 },
  'vip-pass': { animationType: 'luminous-panel', intensity: 'medium', scope: ['inline', 'overlay'], durationMs: 1800 },
  'backstage-pass': { animationType: 'luminous-panel', intensity: 'medium', scope: ['inline', 'overlay'], durationMs: 1800 },
  supernova: { animationType: 'legendary', intensity: 'legendary', scope: ['inline', 'overlay', 'fullscreen'], durationMs: 2600 },
  'double-platinum': { animationType: 'legendary', intensity: 'legendary', scope: ['inline', 'overlay', 'fullscreen'], durationMs: 2800 },
};

const DEFAULT_CONFIG: GiftAnimationConfig = {
  animationType: 'float',
  intensity: 'low',
  scope: ['inline'],
  durationMs: 1200,
};

/**
 * Resolve animation config by gift slug or animationType.
 * Used by UI to choose animation when a gift is sent.
 */
export function getGiftAnimationConfig(slugOrAnimationType: string): GiftAnimationConfig {
  const key = slugOrAnimationType.toLowerCase().replace(/\s+/g, '-');
  return REGISTRY[key] ?? { ...DEFAULT_CONFIG, animationType: slugOrAnimationType };
}
