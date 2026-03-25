import { NextResponse } from 'next/server';
import { listActive } from '@/services/coin-package.service';
import { getStripeRuntimeReadiness } from '@/lib/runtime-config';

export const dynamic = 'force-dynamic';

/**
 * GET /api/coin-packages
 * Returns active, currently valid coin packages ordered by sortOrder.
 * For store UI; no payment processing.
 */
export async function GET() {
  const packages = await listActive();
  const stripe = getStripeRuntimeReadiness();
  return NextResponse.json({
    ok: true,
    packages,
    payments: {
      stripeConfigured: stripe.ready,
      stripeMode: stripe.mode,
      stripeReasons: stripe.reasons,
    },
  });
}
