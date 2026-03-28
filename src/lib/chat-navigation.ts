/**
 * Central DM routes so comment / gift / profile actions can open the same thread URL later.
 * First message still creates the conversation server-side via POST /api/chat/send.
 */
export function inboxThreadPath(peerUserId: string): string {
  return `/inbox/${encodeURIComponent(peerUserId)}`;
}

export function inboxListPath(): string {
  return '/inbox';
}
