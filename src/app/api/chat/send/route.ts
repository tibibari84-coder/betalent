import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { DM_CONTENT_MAX } from '@/lib/chat-constants';
import { sendDmMessage } from '@/services/chat.service';
import { isSchemaDriftError } from '@/lib/runtime-config';
import { isDatabaseUnavailableError } from '@/lib/db-errors';

export async function POST(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }

    let body: { receiverId?: string; content?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 });
    }

    const receiverId = typeof body.receiverId === 'string' ? body.receiverId.trim() : '';
    const content = typeof body.content === 'string' ? body.content : '';
    if (!receiverId) {
      return NextResponse.json({ ok: false, message: 'receiverId required' }, { status: 400 });
    }

    try {
      const message = await sendDmMessage(sessionUser.id, receiverId, content);
      return NextResponse.json({
        ok: true,
        message: {
          id: message.id,
          senderId: message.senderId,
          receiverId: message.receiverId,
          content: message.content,
          isRead: message.isRead,
          readAt: message.readAt?.toISOString() ?? null,
          createdAt: message.createdAt.toISOString(),
        },
      });
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      if (code === 'EMPTY') {
        return NextResponse.json({ ok: false, message: 'Message cannot be empty' }, { status: 400 });
      }
      if (code === 'TOO_LONG') {
        return NextResponse.json(
          { ok: false, message: `Message too long (max ${DM_CONTENT_MAX} characters)` },
          { status: 400 }
        );
      }
      if (code === 'SELF') {
        return NextResponse.json({ ok: false, message: 'Cannot message yourself' }, { status: 400 });
      }
      if (code === 'PEER_NOT_FOUND') {
        return NextResponse.json({ ok: false, message: 'User not found' }, { status: 404 });
      }
      if (code === 'NOT_MUTUAL') {
        return NextResponse.json(
          { ok: false, code: 'NOT_MUTUAL', message: 'Mutual follow required to message' },
          { status: 403 }
        );
      }
      throw err;
    }
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
    console.error('[chat/send]', e);
    return NextResponse.json({ ok: false, message: 'Server error' }, { status: 500 });
  }
}
