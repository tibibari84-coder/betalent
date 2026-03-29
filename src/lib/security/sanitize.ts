/**
 * Server-side text sanitization for user-controlled fields (upload metadata, comments, etc.).
 */

/** Strip NUL and C0 control characters except tab, LF, CR (keeps normal paragraph text). */
export function stripUnsafeTextControls(input: string): string {
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Client-reported filename for upload init — reject path segments and obvious traversal.
 */
export function isSafeUploadFilename(name: string): boolean {
  if (!name || name.length > 255) return false;
  if (name.includes('..') || name.includes('/') || name.includes('\\')) return false;
  if (/[\x00-\x1F\x7F]/.test(name)) return false;
  return true;
}
