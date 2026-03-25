/**
 * Black luxury glass card design system.
 * Cherry is accent only — not base. Cards are black/dark grey glass.
 */
import { accentSoftAlpha } from '@/constants/accent-tokens';

const GLASS_BLUR = 'blur(16px)';
const GLASS_BLUR_WEBKIT = 'blur(16px)';

export const CARD_BASE_STYLE = {
  background: 'rgba(12, 12, 14, 0.75)',
  backdropFilter: GLASS_BLUR,
  WebkitBackdropFilter: GLASS_BLUR_WEBKIT,
  border: `1px solid ${accentSoftAlpha(0.12)}`,
  boxShadow: '0 10px 30px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)',
  borderRadius: '16px',
} as const;

export const CARD_HOVER_STYLE = {
  border: `1px solid ${accentSoftAlpha(0.18)}`,
  boxShadow: '0 12px 36px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.04)',
  transform: 'translateY(-2px)',
} as const;

export const CARD_ACTIVE_STYLE = {
  ...CARD_BASE_STYLE,
  border: `1px solid ${accentSoftAlpha(0.28)}`,
  boxShadow: `0 10px 30px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04), inset 3px 0 0 ${accentSoftAlpha(0.4)}`,
} as const;

/** Cherry glass shell used by sidebar/right-panel utility cards (approved style). */
export const CHERRY_GLASS_PANEL_STYLE = {
  background: 'radial-gradient(circle at top right, rgba(180, 40, 60, 0.18), transparent 60%), rgba(18, 10, 14, 0.85)',
  backdropFilter: GLASS_BLUR,
  WebkitBackdropFilter: GLASS_BLUR_WEBKIT,
  border: `1px solid ${accentSoftAlpha(0.22)}`,
  boxShadow: '0 12px 40px rgba(0,0,0,0.7), 0 0 25px rgba(255, 60, 80, 0.12)',
  borderRadius: '16px',
} as const;

/** Left sidebar nav cards — cherry glass (original style). */
export const SIDEBAR_BASE_STYLE = CHERRY_GLASS_PANEL_STYLE;

export const SIDEBAR_ACTIVE_STYLE = {
  ...CHERRY_GLASS_PANEL_STYLE,
  background: 'radial-gradient(circle at top right, rgba(180, 40, 60, 0.24), transparent 60%), rgba(18, 10, 14, 0.9)',
  border: `1px solid ${accentSoftAlpha(0.35)}`,
  boxShadow: `0 12px 40px rgba(0,0,0,0.7), 0 0 25px rgba(255, 60, 80, 0.12), inset 3px 0 0 ${accentSoftAlpha(0.35)}`,
} as const;

/**
 * Right panel: secondary to main content — calmer glass than sidebar (no heavy cherry glow).
 */
export const RIGHT_PANEL_CARD_STYLE = {
  background: 'rgba(12, 12, 14, 0.82)',
  backdropFilter: GLASS_BLUR,
  WebkitBackdropFilter: GLASS_BLUR_WEBKIT,
  border: `1px solid ${accentSoftAlpha(0.09)}`,
  boxShadow: '0 8px 28px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)',
  borderRadius: '16px',
} as const;

export const RIGHT_PANEL_CARD_GAP = '14px';
export const RIGHT_PANEL_CARD_PADDING = '16px';
