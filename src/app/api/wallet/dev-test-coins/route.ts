import { NextResponse } from 'next/server';
import { requireVerifiedUser } from '@/lib/auth';
import { credit } from '@/services/wallet.service';

const DEV_TEST_COIN_AMOUNT = 100;

/**
 * POST /api/wallet/dev-test-coins
 * Development only: add 100 test coins for gifting without Stripe.
 * Does nothing in production.
 */
export async function POST() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ ok: false, message: 'Not available' }, { status: 404 });
  }

  try {
    const user = await requireVerifiedUser();
    const result = await credit(user.id, DEV_TEST_COIN_AMOUNT, {
      type: 'BONUS',
      description: 'Dev test coins for gifting',
    });

    if (!result.success) {
      return NextResponse.json(
        { ok: false, message: result.reason ?? 'Could not add test coins' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: `+${DEV_TEST_COIN_AMOUNT} test coins added`,
      newBalance: result.newBalance,
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ ok: false, message: 'Login required' }, { status: 401 });
    }
    if (e instanceof Error && e.message === 'Email not verified') {
      return NextResponse.json(
        { ok: false, message: 'Verify your email first' },
        { status: 403 }
      );
    }
    throw e;
  }
}
