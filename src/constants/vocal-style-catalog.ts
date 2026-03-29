/**
 * Canonical vocal performance styles: slug (kebab) + display label.
 * Keep in sync with Category rows (see scripts/upsert-vocal-categories.ts).
 * Used for upload chips, explore, and performanceStyle on Video when slug matches.
 */

export type VocalStyleCatalogEntry = { name: string; slug: string };

/** Full catalog (no "All Voices"). Slugs must match Category.slug in DB. */
export const VOCAL_STYLE_CATALOG: VocalStyleCatalogEntry[] = [
  { name: 'Pop', slug: 'pop' },
  { name: 'R&B', slug: 'rnb' },
  { name: 'Soul', slug: 'soul' },
  { name: 'Gospel', slug: 'gospel' },
  { name: 'Jazz', slug: 'jazz' },
  { name: 'Blues', slug: 'blues' },
  { name: 'Bossa Nova', slug: 'bossa-nova' },
  { name: 'Funk', slug: 'funk' },
  { name: 'Rock', slug: 'rock' },
  { name: 'Alternative', slug: 'alternative' },
  { name: 'Indie', slug: 'indie' },
  { name: 'Country', slug: 'country' },
  { name: 'Folk', slug: 'folk' },
  { name: 'Acoustic', slug: 'acoustic' },
  { name: 'Classical', slug: 'classical' },
  { name: 'Opera', slug: 'opera' },
  { name: 'Musical Theatre', slug: 'musical-theatre' },
  { name: 'Rap / Hip-Hop', slug: 'rap' },
  { name: 'Spoken Word', slug: 'spoken-word' },
  { name: 'Afrobeat', slug: 'afrobeat' },
  { name: 'Reggae', slug: 'reggae' },
  { name: 'Dancehall', slug: 'dancehall' },
  { name: 'Latin', slug: 'latin' },
  { name: 'Latin Pop', slug: 'latin-pop' },
  { name: 'Salsa', slug: 'salsa' },
  { name: 'Bachata', slug: 'bachata' },
  { name: 'Reggaeton', slug: 'reggaeton' },
  { name: 'EDM', slug: 'edm' },
  { name: 'House', slug: 'house' },
  { name: 'Techno', slug: 'techno' },
  { name: 'K-Pop', slug: 'k-pop' },
  { name: 'J-Pop', slug: 'j-pop' },
  { name: 'Arabic', slug: 'arabic' },
  { name: 'Turkish', slug: 'turkish' },
  { name: 'Greek', slug: 'greek' },
  { name: 'Balkan', slug: 'balkan' },
  { name: 'Gospel Choir', slug: 'gospel-choir' },
  { name: 'Worship', slug: 'worship' },
  { name: 'Other', slug: 'other' },
];

const SLUG_SET = new Set(VOCAL_STYLE_CATALOG.map((s) => s.slug));

/** Same slugs as {@link VOCAL_STYLE_CATALOG} — used by GET /api/categories/vocal-styles. */
export const VOCAL_STYLE_SLUG_SET: ReadonlySet<string> = SLUG_SET;

/**
 * True if this category slug should be copied to Video.performanceStyle for personalization.
 */
export function isVocalPerformanceStyleSlug(slug: string): boolean {
  return SLUG_SET.has(slug);
}
