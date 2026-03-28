import { prisma } from '@/lib/prisma';
import { DM_CONTENT_MAX } from '@/lib/chat-constants';

const PREVIEW_MAX = 500;

export type DmAccessState =
  | { canMessage: true; state: 'OPEN'; reason: null; mutualFollow: boolean; priorConsent: boolean }
  | {
      canMessage: false;
      state: 'FOLLOW_TO_MESSAGE' | 'REQUEST_REQUIRED';
      reason: 'NOT_MUTUAL';
      mutualFollow: false;
      priorConsent: boolean;
    };

/** Stable pair: user1Id is always lexicographically less than user2Id. */
export function orderedPairIds(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export function previewText(content: string): string {
  const t = content.replace(/\s+/g, ' ').trim();
  if (t.length <= PREVIEW_MAX) return t;
  return `${t.slice(0, PREVIEW_MAX - 1)}…`;
}

export async function getOrCreateConversation(userA: string, userB: string) {
  const [user1Id, user2Id] = orderedPairIds(userA, userB);
  const existing = await prisma.dmConversation.findUnique({
    where: { user1Id_user2Id: { user1Id, user2Id } },
  });
  if (existing) return existing;
  return prisma.dmConversation.create({
    data: { user1Id, user2Id },
  });
}

export async function listConversationsForUser(viewerId: string) {
  const rows = await prisma.dmConversation.findMany({
    where: {
      OR: [{ user1Id: viewerId }, { user2Id: viewerId }],
    },
    orderBy: [{ lastMessageAt: 'desc' }, { updatedAt: 'desc' }],
    include: {
      user1: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      user2: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });

  const conversationIds = rows.map((r) => r.id);
  const unreadAgg =
    conversationIds.length === 0
      ? []
      : await prisma.dmMessage.groupBy({
          by: ['conversationId'],
          where: {
            conversationId: { in: conversationIds },
            receiverId: viewerId,
            isRead: false,
          },
          _count: { _all: true },
        });
  const unreadMap = new Map(unreadAgg.map((u) => [u.conversationId, u._count._all]));

  const conversations = rows.map((c) => {
    const peer = c.user1Id === viewerId ? c.user2 : c.user1;
    return {
      conversationId: c.id,
      peer: {
        id: peer.id,
        username: peer.username,
        displayName: peer.displayName,
        avatarUrl: peer.avatarUrl,
      },
      lastMessageAt: c.lastMessageAt?.toISOString() ?? null,
      lastMessagePreview: c.lastMessagePreview,
      unreadCount: unreadMap.get(c.id) ?? 0,
    };
  });

  const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0);
  return { conversations, totalUnread };
}

export type ConversationListItem = {
  conversationId: string;
  peer: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  mutualFollow: boolean;
  priorConsent: boolean;
  canMessage: boolean;
};

/**
 * Conversation list + access flags in one shot (tabs: All / Unread / Requests / Following).
 */
export async function listConversationsWithAccessForUser(viewerId: string): Promise<{
  conversations: ConversationListItem[];
  totalUnread: number;
}> {
  const base = await listConversationsForUser(viewerId);
  const { conversations, totalUnread } = base;
  if (conversations.length === 0) {
    return { conversations: [], totalUnread: 0 };
  }

  const conversationIds = conversations.map((c) => c.conversationId);
  const peerIds = Array.from(new Set(conversations.map((c) => c.peer.id)));

  const [iFollowRows, followsMeRows, priorGroups] = await Promise.all([
    prisma.follow.findMany({
      where: { followerId: viewerId, creatorId: { in: peerIds } },
      select: { creatorId: true },
    }),
    prisma.follow.findMany({
      where: { followerId: { in: peerIds }, creatorId: viewerId },
      select: { followerId: true },
    }),
    prisma.dmMessage.groupBy({
      by: ['conversationId'],
      where: {
        conversationId: { in: conversationIds },
        receiverId: viewerId,
        NOT: { senderId: viewerId },
      },
      _count: { _all: true },
    }),
  ]);

  const iFollow = new Set(iFollowRows.map((r) => r.creatorId));
  const followsMe = new Set(followsMeRows.map((r) => r.followerId));
  const priorConsentByConv = new Set(priorGroups.map((g) => g.conversationId));

  const enriched: ConversationListItem[] = conversations.map((c) => {
    const pid = c.peer.id;
    const mutualFollow = iFollow.has(pid) && followsMe.has(pid);
    const priorConsent = priorConsentByConv.has(c.conversationId);
    const canMessage = mutualFollow || priorConsent;
    return {
      ...c,
      mutualFollow,
      priorConsent,
      canMessage,
    };
  });

  return { conversations: enriched, totalUnread };
}

export async function getConversationForPair(viewerId: string, peerId: string) {
  const [user1Id, user2Id] = orderedPairIds(viewerId, peerId);
  return prisma.dmConversation.findUnique({
    where: { user1Id_user2Id: { user1Id, user2Id } },
  });
}

export async function getDmAccessState(viewerId: string, peerId: string): Promise<DmAccessState> {
  const [fwd, rev, conv] = await Promise.all([
    prisma.follow.findUnique({
      where: { followerId_creatorId: { followerId: viewerId, creatorId: peerId } },
      select: { id: true },
    }),
    prisma.follow.findUnique({
      where: { followerId_creatorId: { followerId: peerId, creatorId: viewerId } },
      select: { id: true },
    }),
    getConversationForPair(viewerId, peerId),
  ]);

  const mutualFollow = !!fwd && !!rev;
  if (mutualFollow) {
    return { canMessage: true, state: 'OPEN', reason: null, mutualFollow: true, priorConsent: false };
  }

  // “Existing conversations must remain accessible if already valid”:
  // If the peer has previously messaged the viewer in this conversation, treat it as consent to reply.
  let priorConsent = false;
  if (conv) {
    const peerMessagedMe = await prisma.dmMessage.findFirst({
      where: { conversationId: conv.id, senderId: peerId, receiverId: viewerId },
      select: { id: true },
    });
    priorConsent = !!peerMessagedMe;
  }

  if (priorConsent) {
    return { canMessage: true, state: 'OPEN', reason: null, mutualFollow: false, priorConsent: true };
  }

  return {
    canMessage: false,
    state: 'FOLLOW_TO_MESSAGE',
    reason: 'NOT_MUTUAL',
    mutualFollow: false,
    priorConsent: false,
  };
}

export async function markMessagesRead(conversationId: string, viewerId: string) {
  const now = new Date();
  return prisma.dmMessage.updateMany({
    where: {
      conversationId,
      receiverId: viewerId,
      isRead: false,
    },
    data: { isRead: true, readAt: now },
  });
}

const HISTORY_PAGE = 60;

export async function getMessageHistory(conversationId: string, beforeId?: string | null) {
  const cursor = beforeId
    ? await prisma.dmMessage.findUnique({
        where: { id: beforeId },
        select: { id: true, conversationId: true, createdAt: true },
      })
    : null;
  if (beforeId && (!cursor || cursor.conversationId !== conversationId)) {
    return { messages: [] as Awaited<ReturnType<typeof prisma.dmMessage.findMany>>, hasMore: false };
  }

  const messages = await prisma.dmMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    take: HISTORY_PAGE + 1,
    ...(cursor
      ? {
          cursor: { id: cursor.id },
          skip: 1,
        }
      : {}),
    select: {
      id: true,
      senderId: true,
      receiverId: true,
      content: true,
      isRead: true,
      readAt: true,
      createdAt: true,
    },
  });

  const hasMore = messages.length > HISTORY_PAGE;
  const slice = hasMore ? messages.slice(0, HISTORY_PAGE) : messages;
  return { messages: slice.reverse(), hasMore };
}

export async function sendDmMessage(senderId: string, receiverId: string, content: string) {
  const trimmed = content.trim();
  if (!trimmed) throw new Error('EMPTY');
  if (trimmed.length > DM_CONTENT_MAX) throw new Error('TOO_LONG');
  if (senderId === receiverId) throw new Error('SELF');

  const receiver = await prisma.user.findUnique({
    where: { id: receiverId },
    select: { id: true },
  });
  if (!receiver) throw new Error('PEER_NOT_FOUND');

  const access = await getDmAccessState(senderId, receiverId);
  if (!access.canMessage) {
    throw new Error('NOT_MUTUAL');
  }

  const conv = await getOrCreateConversation(senderId, receiverId);
  const now = new Date();
  const preview = previewText(trimmed);

  const [message] = await prisma.$transaction([
    prisma.dmMessage.create({
      data: {
        conversationId: conv.id,
        senderId,
        receiverId,
        content: trimmed,
      },
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        content: true,
        isRead: true,
        readAt: true,
        createdAt: true,
      },
    }),
    prisma.dmConversation.update({
      where: { id: conv.id },
      data: {
        lastMessageAt: now,
        lastMessagePreview: preview,
      },
    }),
  ]);

  return message;
}
