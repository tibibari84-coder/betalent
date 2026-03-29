/**
 * Shared Zod schemas and parsers for API routes — consistent IDs, query params, and bounds.
 */

import { z } from 'zod';

/** Prisma cuid / cuid2-style ids (generous max to avoid DoS via huge strings). */
export const prismaIdString = z.string().min(1).max(128);

const ID_TOKEN = /^[a-zA-Z0-9_-]{1,128}$/;

/** Parse comma-separated ids from query (feed session / exclude); drops invalid tokens. */
export function parseCommaSeparatedIds(raw: string | null, maxTokens = 200): string[] {
  if (!raw?.trim()) return [];
  const parts = raw
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, maxTokens);
  return parts.filter((p) => ID_TOKEN.test(p));
}

export function parseFeedQueryParams(searchParams: URLSearchParams): {
  limit: number;
  sessionCreatorIds: string[];
  excludeIds: string[];
} {
  const limitRaw = searchParams.get('limit');
  const limitParsed = limitRaw != null ? Number.parseInt(limitRaw, 10) : 30;
  const limit = Number.isFinite(limitParsed) ? Math.min(Math.max(limitParsed, 1), 50) : 30;

  const sessionCreatorIds = parseCommaSeparatedIds(searchParams.get('creatorIds'));
  const excludeIds = parseCommaSeparatedIds(searchParams.get('excludeIds'));

  return { limit, sessionCreatorIds, excludeIds };
}

export const adminVideoOverrideSchema = z.object({
  videoId: prismaIdString,
  action: z.enum(['boost', 'disable', 'reset']),
  boostMultiplier: z.number().finite().positive().max(10).optional(),
});

export const creatorDismissSchema = z.object({
  creatorId: prismaIdString,
  reason: z.enum(['NOT_INTERESTED', 'DISMISSED']).optional(),
});
