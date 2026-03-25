import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getOrCreateWallet } from '@/services/wallet.service';
import { isDatabaseUnavailableError } from '@/lib/db-errors';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }

    const wallet = await getOrCreateWallet(user.id);
    const devTestCoinsAvailable = process.env.NODE_ENV === 'development';
    return NextResponse.json({ ok: true, wallet, devTestCoinsAvailable });
  } catch (e) {
    if (isDatabaseUnavailableError(e)) {
      return NextResponse.json({ ok: false, message: 'Service temporarily unavailable' }, { status: 503 });
    }
    return NextResponse.json({ ok: false, message: 'Failed to load wallet' }, { status: 500 });
  }
}
