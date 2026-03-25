import { NextResponse } from 'next/server';
import { requireVerifiedUser } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import {
  RATE_LIMIT_PURCHASE_PER_IP_PER_HOUR,
  RATE_LIMIT_PURCHASE_PER_USER_PER_HOUR,
} from '@/constants/api-rate-limits';
import { createOrder } from '@/services/coin-purchase.service';
import { createStripeCheckoutSession, isStripeConfigured } from '@/services/payment-providers/stripe-provider';
import { getStripeRuntimeReadiness } from '@/lib/runtime-config';
import { z } from 'zod';
import {
  hasPurchaseVelocityRisk,
  recordFraudEvent,
  recordSupportSignalSnapshot,
} from '@/services/fraud-risk.service';

const bodySchema = z.object({
  packageId: z.string().min(1),
  deviceId: z.string().max(160).optional().nullable(),
  fingerprint: z.string().max(256).optional().nullable(),
});

/**
 * POST /api/coins/purchase
 * Body: { packageId: string }
 *
 * Creates order (PENDING) + Stripe Checkout Session, returns redirectUrl.
 * Amounts and Stripe Price IDs come from the database only; the client cannot set price.
 * Production requires live Stripe keys and `CoinPackage.stripePriceId` per sellable package.
 */
export async function POST(req: Request) {
  try {
    const user = await requireVerifiedUser();
    const ip = getClientIp(req);
    if (
      !(await checkRateLimit('purchase-ip', ip, RATE_LIMIT_PURCHASE_PER_IP_PER_HOUR, 60 * 60 * 1000)) ||
      !(await checkRateLimit('purchase-user', user.id, RATE_LIMIT_PURCHASE_PER_USER_PER_HOUR, 60 * 60 * 1000))
    ) {
      return NextResponse.json(
        { ok: false, code: 'RATE_LIMIT', message: 'Too many purchase attempts. Please try again later.' },
        { status: 429 }
      );
    }
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, code: 'INVALID_BODY', message: 'Invalid purchase payload' },
        { status: 400 }
      );
    }
    const packageId = parsed.data.packageId.trim();
    const deviceId = parsed.data.deviceId?.trim() || null;
    const fingerprint = parsed.data.fingerprint?.trim() || null;
    if (!packageId) {
      return NextResponse.json(
        { ok: false, code: 'PACKAGE_REQUIRED', message: 'packageId is required' },
        { status: 400 }
      );
    }
    await recordSupportSignalSnapshot({
      userId: user.id,
      actionType: 'PURCHASE',
      ip,
      deviceId,
      fingerprint,
    });
    await recordFraudEvent({
      userId: user.id,
      eventType: 'PURCHASE_REQUEST',
      riskLevel: 'LOW',
      details: { packageId },
    });

    const velocity = await hasPurchaseVelocityRisk({
      userId: user.id,
      ip,
      deviceId,
      fingerprint,
      maxPerMinute: 25,
    });
    if (velocity.blocked) {
      return NextResponse.json(
        { ok: false, code: 'PURCHASE_VELOCITY_BLOCK', message: velocity.reason },
        { status: 429 }
      );
    }

    const stripeReadiness = getStripeRuntimeReadiness();
    if (!isStripeConfigured() || !stripeReadiness.ready) {
      if (stripeReadiness.reasons.includes('STRIPE_WEBHOOK_SECRET_INVALID_OR_MISSING')) {
        console.error(
          'Stripe webhook secret missing. Run: stripe listen --forward-to localhost:3000/api/webhooks/stripe'
        );
      }
      return NextResponse.json(
        {
          ok: false,
          code: 'STRIPE_NOT_CONFIGURED',
          message:
            'Stripe test mode is not fully configured. Required: STRIPE_SECRET_KEY (sk_test_...), NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (pk_test_...), STRIPE_WEBHOOK_SECRET (whsec_...).',
          reasons: stripeReadiness.reasons,
          mode: stripeReadiness.mode,
        },
        { status: 503 }
      );
    }

    const result = await createOrder(user.id, packageId, createStripeCheckoutSession, 'STRIPE');

    if (!result.ok) {
      const status = result.code === 'PACKAGE_NOT_FOUND' ? 404 : 400;
      return NextResponse.json(
        { ok: false, code: result.code, message: result.message },
        { status }
      );
    }

    if (result.intent.status === 'FAILED') {
      const safeMessage =
        process.env.NODE_ENV === 'production'
          ? 'Could not start checkout.'
          : (result.intent.message ?? 'Payment failed');
      return NextResponse.json(
        { ok: false, code: 'PAYMENT_FAILED', message: safeMessage },
        { status: 400 }
      );
    }

    if (!result.intent.redirectUrl) {
      return NextResponse.json(
        { ok: false, code: 'PAYMENT_FAILED', message: 'Could not create checkout session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      orderId: result.orderId,
      status: 'PENDING' as const,
      redirectUrl: result.intent.redirectUrl,
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json(
        { ok: false, code: 'UNAUTHORIZED', message: 'Login required' },
        { status: 401 }
      );
    }
    if (e instanceof Error && e.message === 'Email not verified') {
      return NextResponse.json(
        { ok: false, code: 'EMAIL_NOT_VERIFIED', message: 'Verify your email before purchasing coins.' },
        { status: 403 }
      );
    }
    throw e;
  }
}
