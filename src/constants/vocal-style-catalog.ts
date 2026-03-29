/**
 * Canonical vocal / performance style list for upload, feed labels, and DB Category rows.
 * Single source: slug (kebab-case) + display name.
 */
export const VOCAL_STYLE_CATALOG = [
  { slug: 'pop', name: 'Pop' },
  { slug: 'rnb', name: 'R&B' },
  { slug: 'soul', name: 'Soul' },
  { slug: 'gospel', name: 'Gospel' },
  { slug: 'jazz', name: 'Jazz' },
  { slug: 'blues', name: 'Blues' },
  { slug: 'bossa-nova', name: 'Bossa Nova' },
  { slug: 'funk', name: 'Funk' },
  { slug: 'rock', name: 'Rock' },
  { slug: 'alternative', name: 'Alternative' },
  { slug: 'indie', name: 'Indie' },
  { slug: 'country', name: 'Country' },
  { slug: 'folk', name: 'Folk' },
  { slug: 'acoustic', name: 'Acoustic' },
  { slug: 'classical', name: 'Classical' },
  { slug: 'opera', name: 'Opera' },
  { slug: 'musical-theatre', name: 'Musical Theatre' },
  { slug: 'rap-hip-hop', name: 'Rap / Hip-Hop' },
  { slug: 'spoken-word', name: 'Spoken Word' },
  { slug: 'afrobeat', name: 'Afrobeat' },
  { slug: 'reggae', name: 'Reggae' },
  { slug: 'dancehall', name: 'Dancehall' },
  { slug: 'latin-pop', name: 'Latin Pop' },
  { slug: 'salsa', name: 'Salsa' },
  { slug: 'bachata', name: 'Bachata' },
  { slug: 'reggaeton', name: 'Reggaeton' },
  { slug: 'latin', name: 'Latin' },
  { slug: 'edm', name: 'EDM' },
  { slug: 'house', name: 'House' },
  { slug: 'techno', name: 'Techno' },
  { slug: 'k-pop', name: 'K-Pop' },
  { slug: 'j-pop', name: 'J-Pop' },
  { slug: 'arabic', name: 'Arabic' },
  { slug: 'turkish', name: 'Turkish' },
  { slug: 'greek', name: 'Greek' },
  { slug: 'balkan', name: 'Balkan' },
  { slug: 'gospel-choir', name: 'Gospel Choir' },
  { slug: 'worship', name: 'Worship' },
  { slug: 'other', name: 'Other' },
] as const;

export type VocalStyleSlug = (typeof VOCAL_STYLE_CATALOG)[number]['slug'];

export const VOCAL_STYLE_SLUG_SET = new Set<string>(VOCAL_STYLE_CATALOG.map((s) => s.slug));

/** Explore / filters: first row “All” + catalog (same as upload list). */
export const VOCAL_STYLES = [{ name: 'All Voices', slug: '' as const }, ...VOCAL_STYLE_CATALOG] as const;

export const VOCAL_STYLES_UPLOAD = [...VOCAL_STYLE_CATALOG];

export function vocalStyleLabelForSlug(slug: string): string {
  const row = VOCAL_STYLE_CATALOG.find((s) => s.slug === slug);
  return row?.name ?? slug;
}
