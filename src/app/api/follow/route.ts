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

export async function POST(req: Request) {
  const startedAt = performance.now();
  try {
    const user = await requireAuth();
    const { creatorId } = (await req.json()) as { creatorId?: string };

    if (!creatorId) {
      return stampApiResponse(
        NextResponse.json({ ok: false, message: 'creatorId is required' }, { status: 400 }),
        req,
        { routeKey: 'POST /api/follow', cachePolicy: 'none', startedAt }
      );
    }

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
    const user = await requireAuth();
    const { creatorId } = (await req.json()) as { creatorId?: string };

    if (!creatorId) {
      return stampApiResponse(
        NextResponse.json({ ok: false, message: 'creatorId is required' }, { status: 400 }),
        req,
        { routeKey: 'DELETE /api/follow', cachePolicy: 'none', startedAt }
      );
    }

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
