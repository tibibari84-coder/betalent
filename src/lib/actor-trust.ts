/**
 * Actor trust: schema-level source of truth for test/seed/system actors.
 * Notifications and organic engagement surfaces must filter these out.
 */

export type ActorTrustInput = {
  isTestAccount?: boolean | null;
  isSeedAccount?: boolean | null;
  email?: string | null;
};

/**
 * Returns true if the actor should be excluded from notifications and organic engagement.
 * Primary: User.isTestAccount, User.isSeedAccount (schema-level).
 * Fallback: email pattern heuristic for legacy rows before backfill.
 */
export function isUntrustedActor(actor: ActorTrustInput | null | undefined): boolean {
  if (!actor) return true;

  if (actor.isTestAccount === true) return true;
  if (actor.isSeedAccount === true) return true;

  const email = actor.email;
  if (!email || typeof email !== 'string') return true;

  const e = email.toLowerCase().trim();
  if (e.endsWith('@betalent.local')) return true;
  if (/@test\./i.test(e) || /^test@/i.test(e)) return true;
  if (/@seed\./i.test(e) || /^seed@/i.test(e)) return true;

  return false;
}
