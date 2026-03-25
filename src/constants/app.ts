export const APP_NAME = 'BETALENT';
export const APP_SLOGAN = 'Show the World Your Talent';

import { VIDEO_LIMITS } from './video-limits';

/** Fallback upload limits by tier when user.uploadLimitSec not set. Prefer talent-ranking constants. */
export const UPLOAD_LIMITS = {
  STARTER_SEC: VIDEO_LIMITS.STANDARD,
  RISING_SEC: VIDEO_LIMITS.STANDARD,
  FEATURED_SEC: VIDEO_LIMITS.STANDARD,
  SPOTLIGHT_SEC: VIDEO_LIMITS.LIVE,
  GLOBAL_SEC: VIDEO_LIMITS.LIVE,
} as const;

/** Display labels for creator tier. See TALENT_TIER_LABELS in constants/talent-ranking.ts for source of truth. */
export const CREATOR_TIER_LABELS = {
  STARTER: 'Starter Talent',
  RISING: 'Rising Talent',
  FEATURED: 'Featured Talent',
  SPOTLIGHT: 'Spotlight Talent',
  GLOBAL: 'Global Talent',
} as const;

export const GIFT_LABELS = {
  BRONZE_MIC: 'Bronze Mic',
  SILVER_GUITAR: 'Silver Guitar',
  GOLDEN_PIANO: 'Golden Piano',
  DIAMOND_VOICE: 'Diamond Voice',
} as const;

export const GIFT_COIN_AMOUNTS = {
  BRONZE_MIC: 50,
  SILVER_GUITAR: 100,
  GOLDEN_PIANO: 250,
  DIAMOND_VOICE: 500,
} as const;

export const MAX_VIDEO_FILE_SIZE_MB = 150;
export const MAX_VIDEO_FILE_SIZE_BYTES = MAX_VIDEO_FILE_SIZE_MB * 1024 * 1024;

export const ROUTES = {
  HOME: '/',
  FEED: '/feed',
  EXPLORE: '/explore',
  TRENDING: '/trending',
  LEADERBOARD: '/leaderboard',
  FOLLOWING: '/following',
  LOGIN: '/login',
  REGISTER: '/register',
  UPLOAD: '/upload',
  DASHBOARD: '/dashboard',
  SETTINGS: '/settings',
  NOTIFICATIONS: '/notifications',
  MY_VIDEOS: '/my-videos',
  ABOUT: '/about',
  TERMS: '/terms',
  PRIVACY: '/privacy',
  FAIR_PLAY: '/fair-play',
  LEGAL_TERMS: '/legal/terms',
  LEGAL_CREATOR_RULES: '/legal/creator-rules',
  LEGAL_PRIVACY: '/legal/privacy',
  CONTENT_POLICY: '/content-policy',
  MODERATION: '/moderation',
  CONTACT: '/contact',
  CREATOR_ANALYTICS: '/creator/analytics',
} as const;
