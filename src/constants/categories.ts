/** Legacy only. BETALENT is singing-only; discovery and upload use VOCAL_STYLES only. */
import { VOCAL_STYLE_CATALOG } from '@/constants/vocal-style-catalog';

export const TALENT_CATEGORIES = [
  { name: 'Singing', slug: 'singing' },
  { name: 'Radio Jingle', slug: 'radio-jingle' },
  { name: 'Rap', slug: 'rap' },
  { name: 'Instrument', slug: 'instrument' },
  { name: 'Dance', slug: 'dance' },
  { name: 'Performance', slug: 'performance' },
  { name: 'Gospel', slug: 'gospel' },
  { name: 'Beatbox', slug: 'beatbox' },
  { name: 'Special Talent', slug: 'special-talent' },
] as const;

export type CategorySlug = (typeof TALENT_CATEGORIES)[number]['slug'];

/** Music-first vocal platform: discovery strip + upload style chips (includes "All Voices"). */
export const VOCAL_STYLES: { name: string; slug: string }[] = [
  { name: 'All Voices', slug: '' },
  ...VOCAL_STYLE_CATALOG,
];

/** Styles for upload (excludes "All Voices"). */
export const VOCAL_STYLES_UPLOAD = VOCAL_STYLE_CATALOG;

export type VocalStyleSlug = (typeof VOCAL_STYLES)[number]['slug'];
