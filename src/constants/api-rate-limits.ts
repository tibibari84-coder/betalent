/**
 * API rate limits for abuse-sensitive routes.
 * Values are tuned to prevent spam/automation while keeping normal usage unaffected.
 */

// Upload flow (authenticated creator actions)
export const RATE_LIMIT_UPLOAD_INIT_PER_HOUR = 20;
export const RATE_LIMIT_UPLOAD_COMPLETE_PER_HOUR = 30;

// Watch-stat ingestion (high-volume endpoint; limit per video to avoid score spam)
export const RATE_LIMIT_WATCH_STAT_PER_VIDEO_PER_MIN = 120;

// Purchase intent creation (prevents order/session spam)
export const RATE_LIMIT_PURCHASE_PER_USER_PER_HOUR = 12;
export const RATE_LIMIT_PURCHASE_PER_IP_PER_HOUR = 30;
export const RATE_LIMIT_DAILY_BONUS_CLAIM_PER_HOUR = 20;

// Report submission (moderation queue abuse prevention)
export const RATE_LIMIT_REPORTS_PER_USER_PER_HOUR = 20;
export const RATE_LIMIT_REPORTS_PER_IP_PER_HOUR = 60;

// Non-challenge vote endpoints (challenge votes already rate-limited in service layer)
export const RATE_LIMIT_TALENT_VOTE_PER_USER_PER_HOUR = 120;
export const RATE_LIMIT_TALENT_VOTE_PER_IP_PER_HOUR = 300;

// Public contact form (spam prevention)
export const RATE_LIMIT_CONTACT_PER_IP_PER_HOUR = 8;

// Comments (spam / automation)
export const RATE_LIMIT_COMMENT_POST_PER_USER_PER_HOUR = 180;

// Follow / unfollow toggles
export const RATE_LIMIT_FOLLOW_PER_USER_PER_HOUR = 400;

// Video likes
export const RATE_LIMIT_VIDEO_LIKE_PER_USER_PER_HOUR = 600;

// Comment reactions (emoji / heart)
export const RATE_LIMIT_COMMENT_REACTION_PER_USER_PER_HOUR = 600;

// Search (GET — IP-based to limit enumeration / DB load)
export const RATE_LIMIT_SEARCH_PER_IP_PER_MINUTE = 90;

// Direct messages (authenticated — per-user burst control)
export const RATE_LIMIT_DM_SEND_PER_USER_PER_MINUTE = 30;

// Qualified view ingestion (POST /api/view — anon + auth)
export const RATE_LIMIT_VIEW_POST_PER_IP_PER_MINUTE = 180;

// Watch progress for For You scoring (POST /api/watch-progress)
export const RATE_LIMIT_WATCH_PROGRESS_PER_USER_PER_MINUTE = 120;
