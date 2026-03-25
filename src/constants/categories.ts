/** Legacy only. BETALENT is singing-only; discovery and upload use VOCAL_STYLES only. */
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

/** Music-first vocal platform: discovery by vocal / music style (Explore strip, Upload style). */
export const VOCAL_STYLES = [
  { name: 'All Voices', slug: '' },
  { name: 'Pop', slug: 'pop' },
  { name: 'R&B', slug: 'rnb' },
  { name: 'Soul', slug: 'soul' },
  { name: 'Gospel', slug: 'gospel' },
  { name: 'Jazz', slug: 'jazz' },
  { name: 'Rap / Hip-Hop', slug: 'rap' },
  { name: 'Acoustic', slug: 'acoustic' },
  { name: 'Classical / Opera', slug: 'classical' },
  { name: 'Country', slug: 'country' },
  { name: 'Rock', slug: 'rock' },
  { name: 'Indie', slug: 'indie' },
  { name: 'Latin', slug: 'latin' },
  { name: 'Afrobeat', slug: 'afrobeat' },
  { name: 'Folk', slug: 'folk' },
  { name: 'Reggae', slug: 'reggae' },
  { name: 'Alternative', slug: 'alternative' },
  { name: 'Worship', slug: 'worship' },
] as const;

/** Styles for upload (excludes "All Voices"). */
export const VOCAL_STYLES_UPLOAD = VOCAL_STYLES.filter((s) => s.slug !== '');

export type VocalStyleSlug = (typeof VOCAL_STYLES)[number]['slug'];
