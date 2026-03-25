import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { refreshSessionEmailVerifiedFromDb } from '@/lib/auth';

/** Re-sync session flags (e.g. emailVerified) from DB after verifying in another tab. */
export async function POST() {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  await refreshSessionEmailVerifiedFromDb();
  return NextResponse.json({ ok: true });
}
