import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import {
  fulfillOrderByProviderRef,
  markOrderFailedByProviderRef,
} from '@/services/coin-purchase.service';
import { prisma } from '@/lib/prisma';
import { processRefundOrDispute } from '@/services/purchase-reversal.service';
import { getStripeTestClient } from '@/lib/stripe-client';

export async function POST(request: Request) {
  const stripe = getStripeTestClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !secret?.startsWith('whsec_')) {
    console.error(
      'Stripe webhook secret missing. Run: stripe listen --forward-to localhost:3000/api/webhooks/stripe'
    );
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  let body: string;
  try {
    body = await request.text();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const sig = request.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (e) {
    console.error('[webhook/stripe] Signature verification failed', e);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  await prisma.paymentWebhookEvent.upsert({
    where: {
      provider_providerEventId: {
        provider: 'STRIPE',
        providerEventId: event.id,
      },
    },
    create: {
      provider: 'STRIPE',
      providerEventId: event.id,
      eventType: event.type,
      status: 'RECEIVED',
      attempts: 1,
    },
    update: {
      attempts: { increment: 1 },
      updatedAt: new Date(),
    },
  });

  const claim = await prisma.paymentWebhookEvent.updateMany({
    where: {
      provider: 'STRIPE',
      providerEventId: event.id,
      status: { in: ['RECEIVED', 'FAILED'] },
    },
    data: {
      status: 'PROCESSING',
      lastError: null,
    },
  });
  if (claim.count === 0) {
    return NextResponse.json({ received: true, duplicateIgnored: true });
  }

  try {
    await handleStripeEvent(stripe, event);
    await prisma.paymentWebhookEvent.update({
      where: {
        provider_providerEventId: {
          provider: 'STRIPE',
          providerEventId: event.id,
        },
      },
      data: {
        status: 'PROCESSED',
        processedAt: new Date(),
        lastError: null,
      },
    });
    return NextResponse.json({ received: true });
  } catch (err) {
    await prisma.paymentWebhookEvent.update({
      where: {
        provider_providerEventId: {
          provider: 'STRIPE',
          providerEventId: event.id,
        },
      },
      data: {
        status: 'FAILED',
        lastError: err instanceof Error ? err.message : 'Webhook processing failed',
      },
    });
    console.error('[webhook/stripe] Event processing failed', event.type, err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handleStripeEvent(stripe: Stripe, event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (!session.id) throw new Error('Missing checkout session id');
      if (session.mode !== 'payment') throw new Error('Invalid checkout mode');
      if (session.payment_status !== 'paid') throw new Error('Checkout not paid');
      if (session.status !== 'complete') throw new Error('Checkout not complete');
      const result = await fulfillOrderByProviderRef('STRIPE', session.id);
      if (!result.ok) {
        throw new Error(`${result.code}: ${result.message}`);
      }
      return;
    }
    case 'checkout.session.expired':
    case 'checkout.session.async_payment_failed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (!session.id) return;
      const result = await markOrderFailedByProviderRef('STRIPE', session.id);
      if (!result.ok && result.code !== 'ORDER_NOT_FOUND') {
        throw new Error(`ORDER_FAIL_UPDATE: ${result.code}`);
      }
      return;
    }
    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      const checkoutSessionId = await resolveCheckoutSessionIdFromPaymentIntent(
        stripe,
        typeof charge.payment_intent === 'string' ? charge.payment_intent : null
      );
      if (!checkoutSessionId) return;
      const refunds = charge.refunds?.data ?? [];
      if (refunds.length === 0 && charge.amount_refunded > 0) {
        await processRefundOrDispute({
          provider: 'STRIPE',
          providerEventId: event.id,
          eventType: event.type,
          providerReferenceId: checkoutSessionId,
          refundedCents: charge.amount_refunded,
          riskStatus: 'REFUND_REPORTED',
          reason: 'Refund reported by Stripe charge.refunded',
        });
        return;
      }
      for (const rf of refunds) {
        await processRefundOrDispute({
          provider: 'STRIPE',
          providerEventId: `${event.id}:${rf.id}`,
          eventType: event.type,
          providerReferenceId: checkoutSessionId,
          providerRefundId: rf.id,
          refundedCents: rf.amount,
          riskStatus: 'REFUND_REPORTED',
          reason: rf.reason ?? 'Refund reported by Stripe',
          metadata: { refundStatus: rf.status ?? null },
        });
      }
      return;
    }
    case 'charge.dispute.created': {
      const dispute = event.data.object as Stripe.Dispute;
      const pi = typeof dispute.payment_intent === 'string' ? dispute.payment_intent : null;
      const checkoutSessionId = await resolveCheckoutSessionIdFromPaymentIntent(stripe, pi);
      if (!checkoutSessionId) return;
      await processRefundOrDispute({
        provider: 'STRIPE',
        providerEventId: event.id,
        providerDisputeId: dispute.id,
        eventType: event.type,
        providerReferenceId: checkoutSessionId,
        refundedCents: dispute.amount,
        riskStatus: 'DISPUTE_OPEN',
        reason: 'Charge dispute opened',
        metadata: { disputeReason: dispute.reason, disputeStatus: dispute.status },
      });
      return;
    }
    case 'charge.dispute.closed': {
      const dispute = event.data.object as Stripe.Dispute;
      const pi = typeof dispute.payment_intent === 'string' ? dispute.payment_intent : null;
      const checkoutSessionId = await resolveCheckoutSessionIdFromPaymentIntent(stripe, pi);
      if (!checkoutSessionId) return;
      const lost = dispute.status === 'lost' || dispute.status === 'warning_closed';
      await processRefundOrDispute({
        provider: 'STRIPE',
        providerEventId: event.id,
        providerDisputeId: dispute.id,
        eventType: event.type,
        providerReferenceId: checkoutSessionId,
        refundedCents: dispute.amount,
        riskStatus: lost ? 'DISPUTE_LOST' : 'DISPUTE_WON',
        reason: lost ? 'Charge dispute closed against merchant' : 'Charge dispute closed in favor of merchant',
        metadata: { disputeStatus: dispute.status },
      });
      return;
    }
    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent;
      const checkoutSessionId = await resolveCheckoutSessionIdFromPaymentIntent(stripe, pi.id);
      if (!checkoutSessionId) return;
      const result = await markOrderFailedByProviderRef('STRIPE', checkoutSessionId);
      if (!result.ok && result.code !== 'ORDER_NOT_FOUND') {
        throw new Error(`ORDER_FAIL_UPDATE: ${result.code}`);
      }
      return;
    }
    default:
      return;
  }
}

async function resolveCheckoutSessionIdFromPaymentIntent(
  stripe: Stripe,
  paymentIntentId: string | null
): Promise<string | null> {
  if (!paymentIntentId) return null;
  try {
    const sessions = await stripe.checkout.sessions.list({
      payment_intent: paymentIntentId,
      limit: 1,
    });
    return sessions.data[0]?.id ?? null;
  } catch {
    return null;
  }
}
