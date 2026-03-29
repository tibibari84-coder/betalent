/**
 * BETALENT platform rules: authenticity, copyright, and real performance.
 * These rules are shown at upload and enforced through reporting and moderation.
 */

export const PLATFORM_RULES = {
  /** Core rules for real talent platform */
  CORE: [
    'No playback: You must perform live. Pre-recorded backing tracks are allowed for accompaniment only, not for vocals or primary performance.',
    'No lip-sync: Your voice and performance must be real. Lip-syncing to pre-recorded audio is not allowed.',
    'Real performance required: Every video must show you actually performing. BETALENT celebrates real talent.',
  ] as const,
  /** Short labels for UI (e.g. checkboxes) */
  SHORT_LABELS: [
    'No playback',
    'No lip-sync',
    'Real performance required',
  ] as const,
} as const;

export const PLATFORM_RULES_ACKNOWLEDGMENT =
  'I confirm this is my real performance (no playback or lip-sync). I understand that submissions may be reviewed, and violations may result in content removal or account restrictions.';

/** Compact checkbox label for mobile publish (full text still in terms / reporting). */
export const PLATFORM_RULES_ACKNOWLEDGMENT_SHORT =
  'This is my real performance — no playback or lip-sync.';

export type ContentTypeKey = 'ORIGINAL' | 'COVER' | 'REMIX';

export const CONTENT_TYPE_LABELS: Record<ContentTypeKey, string> = {
  ORIGINAL: 'Original',
  COVER: 'Cover',
  REMIX: 'Remix',
};

export const CONTENT_TYPE_DESCRIPTIONS: Record<ContentTypeKey, string> = {
  ORIGINAL: 'Your own composition or original performance',
  COVER: 'Cover of an existing song or work',
  REMIX: 'Remix or adaptation of existing material',
};

/** Publish UI chips (5) → Prisma ContentType (3). Freestyle / Duet / Other store as REMIX. */
export type PublishContentKind = 'original' | 'cover' | 'freestyle' | 'duet' | 'other';

export const PUBLISH_CONTENT_CHIPS: { kind: PublishContentKind; label: string }[] = [
  { kind: 'original', label: 'Original' },
  { kind: 'cover', label: 'Cover' },
  { kind: 'freestyle', label: 'Freestyle' },
  { kind: 'duet', label: 'Duet' },
  { kind: 'other', label: 'Other' },
];

export function mapPublishContentKindToApi(kind: PublishContentKind): ContentTypeKey {
  if (kind === 'original') return 'ORIGINAL';
  if (kind === 'cover') return 'COVER';
  return 'REMIX';
}

export function apiContentTypeToPublishKind(ct: ContentTypeKey): PublishContentKind {
  if (ct === 'ORIGINAL') return 'original';
  if (ct === 'COVER') return 'cover';
  return 'freestyle';
}
