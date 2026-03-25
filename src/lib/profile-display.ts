/**
 * Profile UI — never surface known prisma/seed demo copy as if it were user-authored.
 * Real users should set bio in Settings; legacy DB rows may still contain old seed strings.
 */

const LEGACY_SEED_BIOS_NORMALIZED = new Set([
  'starter tier creator. radio jingle and commercial voice.',
  'rising tier creator. performing for the world.',
]);

function normalizeBioKey(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Returns trimmed bio or '' if this is legacy demo text (not shown as profile identity). */
export function sanitizeProfileBioForDisplay(bio: string | null | undefined): string {
  const t = bio?.trim() ?? '';
  if (!t) return '';
  if (LEGACY_SEED_BIOS_NORMALIZED.has(normalizeBioKey(t))) return '';
  return t;
}
