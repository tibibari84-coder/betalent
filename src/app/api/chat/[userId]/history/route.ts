import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import {
  getConversationForPair,
  getMessageHistory,
  markMessagesRead,
} from '@/services/chat.service';
import { isSchemaDriftError } from '@/lib/runtime-config';
import { isDatabaseUnavailableError } from '@/lib/db-errors';

export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }

    const peerUserId = params.userId?.trim();
    if (!peerUserId || peerUserId === sessionUser.id) {
      return NextResponse.json({ ok: false, message: 'Invalid peer' }, { status: 400 });
    }

    const peer = await prisma.user.findUnique({
      where: { id: peerUserId },
      select: { id: true, username: true, displayName: true, avatarUrl: true },
    });
    if (!peer) {
      return NextResponse.json({ ok: false, message: 'User not found' }, { status: 404 });
    }

    const conv = await getConversationForPair(sessionUser.id, peerUserId);
    if (!conv) {
      return NextResponse.json({
        ok: true,
        conversationId: null,
        messages: [],
        hasMore: false,
        peer,
      });
    }

    const url = new URL(req.url);
    const before = url.searchParams.get('before')?.trim() || undefined;

    await markMessagesRead(conv.id, sessionUser.id);
    const { messages, hasMore } = await getMessageHistory(conv.id, before);
    return NextResponse.json({
      ok: true,
      conversationId: conv.id,
      messages: messages.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        receiverId: m.receiverId,
        content: m.content,
        isRead: m.isRead,
        readAt: m.readAt?.toISOString() ?? null,
        createdAt: m.createdAt.toISOString(),
      })),
      hasMore,
      peer,
    });
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
    console.error('[chat/history]', e);
    return NextResponse.json({ ok: false, message: 'Server error' }, { status: 500 });
  }
}
