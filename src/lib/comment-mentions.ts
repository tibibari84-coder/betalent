/**
 * Extract @username tokens from comment body (ASCII usernames only; matches BETALENT username rules).
 */
const MENTION_RE = /@([a-zA-Z0-9_]{2,30})\b/g;

export function extractMentionUsernames(body: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(MENTION_RE.source, 'g');
  while ((m = re.exec(body)) !== null) {
    const u = m[1].toLowerCase();
    if (!seen.has(u)) {
      seen.add(u);
      out.push(m[1]);
    }
  }
  return out;
}
