/**
 * BETALENT Weekly Live Cover Challenge – artist themes and performance styles.
 * Platform chooses the artist; users choose the style of their cover.
 */

/** Performance styles users can choose for their cover. Matches VOCAL_STYLES where applicable. */
export const COVER_CHALLENGE_STYLES = [
  { name: 'Pop', slug: 'pop' },
  { name: 'R&B', slug: 'rnb' },
  { name: 'Soul', slug: 'soul' },
  { name: 'Gospel', slug: 'gospel' },
  { name: 'Jazz', slug: 'jazz' },
  { name: 'Acoustic', slug: 'acoustic' },
  { name: 'Rock', slug: 'rock' },
  { name: 'Latin', slug: 'latin' },
  { name: 'Afrobeat', slug: 'afrobeat' },
  { name: 'Classical / Opera', slug: 'classical' },
  { name: 'Worship', slug: 'worship' },
] as const;

export type CoverChallengeStyleSlug = (typeof COVER_CHALLENGE_STYLES)[number]['slug'];

import { VIDEO_LIMITS } from './video-limits';

/**
 * Recommended `Challenge.maxDurationSec` for weekly cover challenges (seconds).
 * Effective platform cap for entry/upload is `getLiveChallengeRecordingCapSec(maxDurationSec)` (max 150).
 */
export const COVER_CHALLENGE_MAX_DURATION_SEC = VIDEO_LIMITS.STANDARD;

/** Preplanned 50 weeks of artist themes for Live Cover Challenge. */
export const WEEKLY_ARTIST_THEMES: readonly string[] = [
  'Michael Jackson',
  'Whitney Houston',
  'Mariah Carey',
  'Celine Dion',
  'Adele',
  'Beyoncé',
  'Elvis Presley',
  'Frank Sinatra',
  'Aretha Franklin',
  'Stevie Wonder',
  'Prince',
  'Tina Turner',
  'Bruno Mars',
  'Ed Sheeran',
  'Rihanna',
  'Christina Aguilera',
  'Alicia Keys',
  'Sam Smith',
  'The Weeknd',
  'Lady Gaga',
  'Freddie Mercury / Queen',
  'Elton John',
  'Lionel Richie',
  'Diana Ross',
  'Jennifer Hudson',
  'Ariana Grande',
  'Barbra Streisand',
  'Etta James',
  'John Legend',
  'Sia',
  'Justin Bieber',
  'Justin Timberlake',
  'Shania Twain',
  'Dolly Parton',
  'Andrea Bocelli',
  'Celine / Power Ballads',
  'Gospel Legends',
  'Motown Legends',
  'Amy Winehouse',
  'George Michael',
  'Lauryn Hill',
  'Usher',
  'Chris Brown',
  'Billie Eilish',
  'Harry Styles',
  'ABBA',
  'Beatles',
  'Bob Marley',
  'Latin Legends',
  'Global Divas Finale',
] as const;
