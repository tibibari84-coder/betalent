import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { listConversationsWithAccessForUser } from '@/services/chat.service';
import { isSchemaDriftError } from '@/lib/runtime-config';
import { isDatabaseUnavailableError } from '@/lib/db-errors';

export async function GET() {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { conversations, totalUnread } = await listConversationsWithAccessForUser(sessionUser.id);
    return NextResponse.json({ ok: true, conversations, totalUnread });
  } catch (e) {
    if (isSchemaDriftError(e)) {
      return NextResponse.json(
        { ok: false, message: 'Chat schema not migrated. Run prisma migrate.' },
        { status: 503 }
      );
    }
    if (isDatabaseUnavailableError(e)) {
      return NextResponse.json({ ok: false, message: 'Database unavailable' }, { status: 503 });
    }
    console.error('[chat/conversations]', e);
    return NextResponse.json({ ok: false, message: 'Server error' }, { status: 500 });
  }
}
