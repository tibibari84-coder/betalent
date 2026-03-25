/**
 * In-memory event emitter for SSE / real-time broadcast.
 * Single-instance: for multi-instance use Redis pub/sub.
 */

import { EventEmitter } from 'events';

export type LiveSessionEvent =
  | { type: 'session_update'; sessionId: string; payload: object }
  | { type: 'leaderboard'; sessionId: string; payload: object }
  | { type: 'current_performer'; sessionId: string; payload: object }
  | { type: 'vote'; sessionId: string; performerUserId: string }
  | { type: 'gift'; sessionId: string; performerUserId: string };

/** Payload for `emitLiveSessionEvent` (sessionId is injected by the emitter). */
export type LiveSessionEmitInput =
  | { type: 'session_update'; payload: object }
  | { type: 'leaderboard'; payload: object }
  | { type: 'current_performer'; payload: object }
  | { type: 'vote'; performerUserId: string }
  | { type: 'gift'; performerUserId: string };

const emitter = new EventEmitter();
emitter.setMaxListeners(100);

export function emitLiveSessionEvent(sessionId: string, event: LiveSessionEmitInput) {
  const full: LiveSessionEvent = { ...event, sessionId };
  emitter.emit(`session:${sessionId}`, full);
}

export function subscribeLiveSession(sessionId: string, callback: (event: LiveSessionEvent) => void) {
  const handler = (e: LiveSessionEvent) => callback(e);
  emitter.on(`session:${sessionId}`, handler);
  return () => emitter.off(`session:${sessionId}`, handler);
}
