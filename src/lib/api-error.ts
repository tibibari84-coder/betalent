import { NextResponse } from 'next/server';

/**
 * Standard API error envelope for JSON routes.
 * Clients should read `message` for display; `code` is optional machine id; `step` for multi-phase flows (upload).
 */
export type ApiErrorPayload = {
  ok: false;
  message: string;
  code?: string;
  step?: string;
  errors?: unknown;
};

export function apiError(
  status: number,
  message: string,
  opts?: { code?: string; step?: string; errors?: unknown }
): NextResponse {
  const body: ApiErrorPayload = { ok: false, message, ...opts };
  return NextResponse.json(body, { status });
}
