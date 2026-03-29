/** Legacy talent buckets (non–vocal-primary). Kept for seed / old references. */
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

export {
  VOCAL_STYLES,
  VOCAL_STYLES_UPLOAD,
  VOCAL_STYLE_CATALOG,
  vocalStyleLabelForSlug,
} from '@/constants/vocal-style-catalog';
export type { VocalStyleSlug } from '@/constants/vocal-style-catalog';
