import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-error';
import { requireVerifiedUser } from '@/lib/auth';
import { sendGift } from '@/services/gift.service';
import { upsertVideoRankingStats } from '@/services/ranking.service';
import { validateSupportAction, maybeFlagSupportForReview } from '@/services/support-validation.service';
import { prisma } from '@/lib/prisma';
import type { SendGiftErrorCode } from '@/services/gift.service';
import { getClientIp } from '@/lib/rate-limit';
import { stampApiResponse } from '@/lib/api-route-observe';
import { isDatabaseUnavailableError } from '@/lib/db-errors';

const ROUTE_KEY = 'POST /api/gifts/send';

function giftRes(res: NextResponse, req: Request, startedAt: number): NextResponse {
  return stampApiResponse(res, req, { routeKey: ROUTE_KEY, cachePolicy: 'none', startedAt });
}

const ERROR_STATUS: Record<SendGiftErrorCode, number> = {
  UNAUTHORIZED: 401,
  VIDEO_NOT_FOUND: 404,
  CANNOT_GIFT_OWN_VIDEO: 400,
  GIFT_NOT_FOUND: 404,
  GIFT_INACTIVE: 400,
  INSUFFICIENT_BALANCE: 400,
  RATE_LIMIT_EXCEEDED: 429,
  HIGH_FREQUENCY_PAIR: 429,
  DUPLICATE_ATTEMPT: 429,
  IDEMPOTENCY_CONFLICT: 409,
  LIVE_SESSION_REQUIRED: 400,
  LIVE_CONTEXT_INVALID: 400,
};

export async function POST(req: Request) {
  const startedAt = performance.now();
  try {
    const user = await requireVerifiedUser();
    const body = (await req.json()) as {
      videoId?: string;
      giftId?: string;
      context?: 'foryou' | 'challenge' | 'live' | null;
      liveSessionId?: string | null;
      idempotencyKey?: string | null;
    };
    const videoId = typeof body.videoId === 'string' ? body.videoId.trim() : '';
    const giftId = typeof body.giftId === 'string' ? body.giftId.trim() : '';
    const context =
      body.context === 'challenge'
        ? ('challenge' as const)
        : body.context === 'live'
          ? ('live' as const)
          : ('foryou' as const);
    const liveSessionId =
      typeof body.liveSessionId === 'string' && body.liveSessionId.trim() ? body.liveSessionId.trim() : undefined;
    const idempotencyKey =
      typeof body.idempotencyKey === 'string' && body.idempotencyKey.trim()
        ? body.idempotencyKey.trim()
        : undefined;
    const ip = getClientIp(req);
    const deviceId = req.headers.get('x-device-id');
    const fingerprint = req.headers.get('x-device-fingerprint') ?? req.headers.get('user-agent');

    const video = videoId
      ? await prisma.video.findUnique({ where: { id: videoId }, select: { creatorId: true } })
      : null;
    let giftValidation: { allowed: true; flagForReview?: boolean } | { allowed: false; reason: string; code: string } | null = null;
    if (videoId && video) {
      giftValidation = await validateSupportAction({
        userId: user.id,
        actionType: 'GIFT',
        targetCreatorId: video.creatorId,
        videoId,
        ip,
        deviceId,
        fingerprint,
      });
      if (!giftValidation.allowed) {
        const status = giftValidation.code === 'FRAUD_RISK_BLOCK' ? 403 : 429;
        return giftRes(
          NextResponse.json({ ok: false, message: giftValidation.reason, code: giftValidation.code }, { status }),
          req,
          startedAt
        );
      }
    }

    const result = await sendGift(user.id, {
      videoId,
      giftId,
      context,
      liveSessionId,
      idempotencyKey,
    });

    if (result.success) {
      if (videoId && video && giftValidation?.allowed && giftValidation.flagForReview) {
        maybeFlagSupportForReview({
          userId: user.id,
          targetUserId: video.creatorId,
          videoId,
          type: 'GIFT',
          sourceId: 'giftTransactionId' in result ? result.giftTransactionId : undefined,
          reason: 'HIGH_RISK_USER',
        }).catch(() => {});
      }
      upsertVideoRankingStats(videoId).catch(() => {});
      if ('idempotencyReplay' in result && result.idempotencyReplay) {
        try {
          const parsed = JSON.parse(result.responseBody) as object;
          return giftRes(NextResponse.json(parsed), req, startedAt);
        } catch {
          return giftRes(apiError(500, 'Replay response invalid', { code: 'IDEMPOTENCY_REPLAY_INVALID' }), req, startedAt);
        }
      }
      if ('giftTransactionId' in result) {
        return giftRes(
          NextResponse.json({
            ok: true,
            message: 'Gift sent',
            giftTransactionId: result.giftTransactionId,
            coinAmount: result.coinAmount,
            senderNewBalance: result.senderNewBalance,
            sessionStreak: result.sessionStreak,
            resolvedContext: result.resolvedContext,
            topSupporter: result.topSupporter,
            video: {
              coinsCount: result.videoCoinsCount,
              giftsCount: result.videoGiftsCount,
            },
          }),
          req,
          startedAt
        );
      }
    }

    if (!result.success) {
      const status = ERROR_STATUS[result.code] ?? 400;
      return giftRes(
        NextResponse.json({ ok: false, code: result.code, message: result.message }, { status }),
        req,
        startedAt
      );
    }
    return giftRes(apiError(500, 'Unexpected response', { code: 'GIFT_UNEXPECTED' }), req, startedAt);
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return giftRes(
        NextResponse.json({ ok: false, message: 'Login required', code: 'UNAUTHORIZED' }, { status: 401 }),
        req,
        startedAt
      );
    }
    if (e instanceof Error && e.message === 'Email not verified') {
      return giftRes(
        NextResponse.json(
          { ok: false, message: 'Verify your email before sending gifts.', code: 'EMAIL_NOT_VERIFIED' },
          { status: 403 }
        ),
        req,
        startedAt
      );
    }
    if (isDatabaseUnavailableError(e)) {
      return giftRes(
        NextResponse.json({ ok: false, message: 'Service temporarily unavailable', code: 'DB_UNAVAILABLE' }, { status: 503 }),
        req,
        startedAt
      );
    }
    console.error('[gifts/send]', e);
    return giftRes(apiError(500, 'Gift send failed', { code: 'GIFT_FAILED' }), req, startedAt);
  }
}
