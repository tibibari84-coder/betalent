/**
 * Follow API
 * POST /api/follow – authenticated user follows a creator. Body: { creatorId }.
 * DELETE /api/follow – unfollow. Body: { creatorId }.
 * - Prevents self-follow
 * - Prevents duplicate follow (idempotent)
 * - Updates creator followersCount and user followingCount
 * Returns: { ok, following, followersCount? }.
 *
 * Core logic: {@link followCreatorOrNoOp} / {@link unfollowCreatorOrNoOp} in follow.service.
 */
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { followCreatorOrNoOp, unfollowCreatorOrNoOp } from '@/services/follow.service';
import { isDatabaseUnavailableError } from '@/lib/db-errors';
import { stampApiResponse } from '@/lib/api-route-observe';
import { checkRateLimit } from '@/lib/rate-limit';
import { blockDisallowedMutationOrigin } from '@/lib/mutation-origin';
import { RATE_LIMIT_FOLLOW_PER_USER_PER_HOUR } from '@/constants/api-rate-limits';
import { z } from 'zod';

const followBodySchema = z.object({ creatorId: z.string().cuid() });

export async function POST(req: Request) {
  const startedAt = performance.now();
  try {
    const originDeny = blockDisallowedMutationOrigin(req);
    if (originDeny) return stampApiResponse(originDeny, req, { routeKey: 'POST /api/follow', cachePolicy: 'none', startedAt });

    const user = await requireAuth();
    if (!(await checkRateLimit('follow-toggle-user', user.id, RATE_LIMIT_FOLLOW_PER_USER_PER_HOUR, 60 * 60 * 1000))) {
      return stampApiResponse(
        NextResponse.json({ ok: false, message: 'Too many follow actions. Please try again later.' }, { status: 429 }),
        req,
        { routeKey: 'POST /api/follow', cachePolicy: 'none', startedAt }
      );
    }
    const parsed = followBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return stampApiResponse(
        NextResponse.json({ ok: false, message: 'Invalid creatorId' }, { status: 400 }),
        req,
        { routeKey: 'POST /api/follow', cachePolicy: 'none', startedAt }
      );
    }
    const { creatorId } = parsed.data;

    if (creatorId === user.id) {
      return stampApiResponse(
        NextResponse.json({ ok: false, message: 'You cannot follow yourself' }, { status: 400 }),
        req,
        { routeKey: 'POST /api/follow', cachePolicy: 'none', startedAt }
      );
    }

    const result = await followCreatorOrNoOp(user.id, creatorId);
    return stampApiResponse(
      NextResponse.json({
        ok: true,
        following: result.following,
        followersCount: result.followersCount,
      }),
      req,
      { routeKey: 'POST /api/follow', cachePolicy: 'none', startedAt }
    );
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return stampApiResponse(
        NextResponse.json({ ok: false, message: 'Login required' }, { status: 401 }),
        req,
        { routeKey: 'POST /api/follow', cachePolicy: 'none', startedAt }
      );
    }
    if (isDatabaseUnavailableError(e)) {
      return stampApiResponse(
        NextResponse.json({ ok: false, message: 'Service temporarily unavailable' }, { status: 503 }),
        req,
        { routeKey: 'POST /api/follow', cachePolicy: 'none', startedAt }
      );
    }
    return stampApiResponse(
      NextResponse.json({ ok: false, message: 'Follow failed' }, { status: 500 }),
      req,
      { routeKey: 'POST /api/follow', cachePolicy: 'none', startedAt }
    );
  }
}

export async function DELETE(req: Request) {
  const startedAt = performance.now();
  try {
    const originDeny = blockDisallowedMutationOrigin(req);
    if (originDeny) return stampApiResponse(originDeny, req, { routeKey: 'DELETE /api/follow', cachePolicy: 'none', startedAt });

    const user = await requireAuth();
    if (!(await checkRateLimit('follow-toggle-user', user.id, RATE_LIMIT_FOLLOW_PER_USER_PER_HOUR, 60 * 60 * 1000))) {
      return stampApiResponse(
        NextResponse.json({ ok: false, message: 'Too many follow actions. Please try again later.' }, { status: 429 }),
        req,
        { routeKey: 'DELETE /api/follow', cachePolicy: 'none', startedAt }
      );
    }
    const parsed = followBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return stampApiResponse(
        NextResponse.json({ ok: false, message: 'Invalid creatorId' }, { status: 400 }),
        req,
        { routeKey: 'DELETE /api/follow', cachePolicy: 'none', startedAt }
      );
    }
    const { creatorId } = parsed.data;

    if (creatorId === user.id) {
      return stampApiResponse(
        NextResponse.json({ ok: false, message: 'You cannot unfollow yourself' }, { status: 400 }),
        req,
        { routeKey: 'DELETE /api/follow', cachePolicy: 'none', startedAt }
      );
    }

    const result = await unfollowCreatorOrNoOp(user.id, creatorId);
    return stampApiResponse(
      NextResponse.json({
        ok: true,
        following: result.following,
        followersCount: result.followersCount,
      }),
      req,
      { routeKey: 'DELETE /api/follow', cachePolicy: 'none', startedAt }
    );
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return stampApiResponse(
        NextResponse.json({ ok: false, message: 'Login required' }, { status: 401 }),
        req,
        { routeKey: 'DELETE /api/follow', cachePolicy: 'none', startedAt }
      );
    }
    if (isDatabaseUnavailableError(e)) {
      return stampApiResponse(
        NextResponse.json({ ok: false, message: 'Service temporarily unavailable' }, { status: 503 }),
        req,
        { routeKey: 'DELETE /api/follow', cachePolicy: 'none', startedAt }
      );
    }
    return stampApiResponse(
      NextResponse.json({ ok: false, message: 'Unfollow failed' }, { status: 500 }),
      req,
      { routeKey: 'DELETE /api/follow', cachePolicy: 'none', startedAt }
    );
  }
}
