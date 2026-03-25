/** Mask for display on verification screens (e.g. j***@example.com). */
export function maskEmail(email: string): string {
  const t = email.trim();
  const at = t.indexOf('@');
  if (at < 1) return 'your email';
  const local = t.slice(0, at);
  const domain = t.slice(at + 1);
  if (!domain) return 'your email';
  const visible = local.slice(0, 1);
  return `${visible}***@${domain}`;
}
