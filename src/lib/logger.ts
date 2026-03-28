/**
 * Structured JSON logs for Vercel / log drains. One line per entry.
 * Use ops-events for domain telemetry; use logger for infra + errors.
 */

import { sanitizeLogFields } from '@/lib/log-sanitize';

export type LogLevel = 'info' | 'warn' | 'error';

function basePayload() {
  return {
    service: 'betalent',
    ts: new Date().toISOString(),
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
    release:
      process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
      process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.trim() ||
      undefined,
  };
}

function emit(level: LogLevel, msg: string, fields?: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'test') return;
  const line = JSON.stringify({
    level,
    msg,
    ...basePayload(),
    ...(sanitizeLogFields(fields) ?? {}),
  });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  info(msg: string, fields?: Record<string, unknown>) {
    emit('info', msg, fields);
  },
  warn(msg: string, fields?: Record<string, unknown>) {
    emit('warn', msg, fields);
  },
  error(msg: string, fields?: Record<string, unknown>) {
    emit('error', msg, fields);
  },
};
