import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { claimDailyBonus } from '@/services/wallet.service';
import { COIN_DAILY_BONUS } from '@/constants/coins';
import { RATE_LIMIT_DAILY_BONUS_CLAIM_PER_HOUR } from '@/constants/api-rate-limits';

/**
 * POST /api/wallet/daily-bonus
 * Claim daily login bonus once per calendar day (UTC).
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }
  if (
    !(await checkRateLimit(
      'daily-bonus-user',
      user.id,
      RATE_LIMIT_DAILY_BONUS_CLAIM_PER_HOUR,
      60 * 60 * 1000
    ))
  ) {
    return NextResponse.json({ ok: false, message: 'Too many daily bonus attempts' }, { status: 429 });
  }

  const result = await claimDailyBonus(user.id, COIN_DAILY_BONUS);

  if (!result.success && result.reason === 'already_claimed') {
    return NextResponse.json(
      { ok: false, message: 'Daily bonus already claimed today', alreadyClaimed: true },
      { status: 200 }
    );
  }
  if (!result.success && result.reason === 'wallet_not_found') {
    return NextResponse.json({ ok: false, message: 'Wallet not found' }, { status: 404 });
  }
  if (!result.success) {
    return NextResponse.json({ ok: false, message: 'Could not claim bonus' }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    message: 'Daily bonus claimed',
    newBalance: result.newBalance,
    amount: COIN_DAILY_BONUS,
  });
}
