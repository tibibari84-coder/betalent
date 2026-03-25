import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { isSchemaDriftError } from '@/lib/runtime-config';
import { isDatabaseUnavailableError } from '@/lib/db-errors';

/** Lightweight count for navbar/sidebar polling. */
export async function GET() {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }

    const totalUnread = await prisma.dmMessage.count({
      where: { receiverId: sessionUser.id, isRead: false },
    });
    return NextResponse.json({ ok: true, totalUnread });
  } catch (e) {
    if (isSchemaDriftError(e)) {
      return NextResponse.json({ ok: false, totalUnread: 0, message: 'schema' }, { status: 503 });
    }
    if (isDatabaseUnavailableError(e)) {
      return NextResponse.json({ ok: false, totalUnread: 0 }, { status: 503 });
    }
    console.error('[chat/unread]', e);
    return NextResponse.json({ ok: false, totalUnread: 0 }, { status: 500 });
  }
}
