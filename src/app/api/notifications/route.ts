import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { isSchemaDriftError } from '@/lib/runtime-config';
import { isDatabaseUnavailableError } from '@/lib/db-errors';
import { isUntrustedActor } from '@/lib/actor-trust';

/** Maximum age of notifications (days). Excludes old/onboarding artifacts. */
const NOTIFICATION_MAX_AGE_DAYS = 90;

/** User select for actor trust (schema-level + email fallback). */
/** No email — trust flags + optional email heuristic only when other code passes email. */
const ACTOR_SELECT = {
  id: true,
  displayName: true,
  username: true,
  isTestAccount: true,
  isSeedAccount: true,
} as const;

function isSignInNotificationRow(row: { action: string; meta: unknown }): boolean {
  if (row.action === 'GOOGLE_SIGNIN' || row.action === 'GOOGLE_LINKED') return true;
  if (row.action !== 'LOGIN_SUCCESS') return false;
  const meta = row.meta;
  if (meta && typeof meta === 'object' && meta !== null && 'step' in meta) {
    const step = (meta as { step?: string }).step;
    if (step === 'password_ok_pending_totp') return false;
  }
  return true;
}

function signInNotificationMessage(row: { action: string; meta: unknown }): string {
  if (row.action === 'GOOGLE_LINKED') return 'Your Google account was linked to BETALENT.';
  if (row.action === 'GOOGLE_SIGNIN') return 'You signed in to BETALENT with Google.';
  const meta = row.meta;
  const step =
    meta && typeof meta === 'object' && meta !== null && 'step' in meta
      ? (meta as { step?: string }).step
      : undefined;
  if (step === 'totp_complete') return 'You signed in with your password and authenticator app.';
  return 'You signed in to BETALENT.';
}

function timeAgo(d: Date) {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return d.toLocaleDateString();
}

export type NotificationPayload = {
  id: string;
  type: 'follow' | 'vote' | 'comment' | 'gift' | 'security';
  message: string;
  actorName: string;
  timestamp: string;
  href: string;
  isRead: boolean;
  readAt?: string | null;
  /** Required for gift (and other) notifications */
  recipientId?: string;
  actorId?: string;
  relatedVideoId?: string;
  relatedGiftId?: string;
  createdAt: string;
};

export async function GET() {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }

    const uid = sessionUser.id;

    const notifyPrefs = await prisma.user.findUnique({
      where: { id: uid },
      select: {
        notifyChallenges: true,
        notifyVotes: true,
        notifyFollowers: true,
        notifyComments: true,
        notifyAnnouncements: true,
      },
    });
    const prefs = notifyPrefs ?? {
      notifyChallenges: true,
      notifyVotes: true,
      notifyFollowers: true,
      notifyComments: true,
      notifyAnnouncements: true,
    };

  const cutoff = new Date(Date.now() - NOTIFICATION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
  const recentWhere = { createdAt: { gte: cutoff } } as const;
  const takeLimit = 100;

  const [likes, commentsOnMyVideos, commentRepliesToMe, mentions, follows, gifts, signInAudits] = await Promise.all([
    prisma.like.findMany({
      where: { video: { creatorId: uid }, ...recentWhere },
      include: { user: { select: ACTOR_SELECT }, video: true },
      orderBy: { createdAt: 'desc' },
      take: takeLimit,
    }),
    prisma.comment.findMany({
      where: { video: { creatorId: uid }, parentId: null, isDeleted: false, ...recentWhere },
      include: { user: { select: ACTOR_SELECT }, video: true },
      orderBy: { createdAt: 'desc' },
      take: takeLimit,
    }),
    prisma.comment.findMany({
      where: {
        parent: { userId: uid },
        userId: { not: uid },
        isDeleted: false,
        ...recentWhere,
      },
      include: {
        user: { select: ACTOR_SELECT },
        video: true,
        parent: { select: { id: true, userId: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: takeLimit,
    }),
    prisma.commentMention.findMany({
      where: { userId: uid, comment: { isDeleted: false, ...recentWhere } },
      include: {
        comment: {
          include: {
            user: { select: ACTOR_SELECT },
            video: { select: { creatorId: true } },
            parent: { select: { userId: true } },
          },
        },
      },
      orderBy: { comment: { createdAt: 'desc' } },
      take: takeLimit,
    }),
    prisma.follow.findMany({
      where: { creatorId: uid, source: 'ORGANIC', ...recentWhere },
      include: {
        follower: { select: ACTOR_SELECT },
        creator: { select: { createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: takeLimit,
    }),
    prisma.giftTransaction.findMany({
      where: { receiverId: uid, status: 'COMPLETED', ...recentWhere },
      include: { sender: { select: ACTOR_SELECT }, video: true, gift: true },
      orderBy: { createdAt: 'desc' },
      take: takeLimit,
    }),
    prisma.authAuditLog.findMany({
      where: {
        userId: uid,
        createdAt: { gte: cutoff },
        action: { in: ['LOGIN_SUCCESS', 'GOOGLE_SIGNIN', 'GOOGLE_LINKED'] },
      },
      orderBy: { createdAt: 'desc' },
      take: takeLimit,
      select: { id: true, action: true, meta: true, createdAt: true },
    }),
  ]);

  type Item = Omit<NotificationPayload, 'createdAt' | 'isRead' | 'readAt'> & {
    createdAt: Date;
    recipientId?: string;
    actorId?: string;
    relatedVideoId?: string;
    relatedGiftId?: string;
  };
  const items: Item[] = [];

  const actor = (u: { displayName: string | null; username: string }) =>
    u.displayName || u.username;

  for (const like of likes) {
    if (isUntrustedActor(like.user)) continue;
    items.push({
      id: `like-${like.id}`,
      type: 'vote',
      message: 'Your performance received a new vote',
      actorName: actor(like.user),
      timestamp: timeAgo(like.createdAt),
      href: `/video/${like.videoId}`,
      recipientId: uid,
      actorId: like.userId,
      relatedVideoId: like.videoId,
      createdAt: like.createdAt,
    });
  }

  const commentIdsWithNotification = new Set<string>();
  for (const comment of commentsOnMyVideos) {
    if (isUntrustedActor(comment.user)) continue;
    commentIdsWithNotification.add(comment.id);
    items.push({
      id: `comment-${comment.id}`,
      type: 'comment',
      message: `${actor(comment.user)} commented on your video`,
      actorName: actor(comment.user),
      timestamp: timeAgo(comment.createdAt),
      href: `/video/${comment.videoId}`,
      recipientId: uid,
      actorId: comment.userId,
      relatedVideoId: comment.videoId,
      createdAt: comment.createdAt,
    });
  }

  for (const reply of commentRepliesToMe) {
    if (isUntrustedActor(reply.user)) continue;
    commentIdsWithNotification.add(reply.id);
    items.push({
      id: `reply-${reply.id}`,
      type: 'comment',
      message: `${actor(reply.user)} replied to your comment`,
      actorName: actor(reply.user),
      timestamp: timeAgo(reply.createdAt),
      href: `/video/${reply.videoId}`,
      recipientId: uid,
      actorId: reply.userId,
      relatedVideoId: reply.videoId,
      createdAt: reply.createdAt,
    });
  }

  for (const row of mentions) {
    const c = row.comment;
    if (c.isDeleted) continue;
    if (isUntrustedActor(c.user)) continue;
    if (commentIdsWithNotification.has(c.id)) continue;
    const videoCreatorId = (c.video as { creatorId: string })?.creatorId;
    const parentUserId = (c.parent as { userId: string } | null)?.userId;
    if (videoCreatorId === uid) continue;
    if (parentUserId === uid) continue;
    items.push({
      id: `mention-${row.id}`,
      type: 'comment',
      message: `${actor(c.user)} mentioned you in a comment`,
      actorName: actor(c.user),
      timestamp: timeAgo(c.createdAt),
      href: `/video/${c.videoId}`,
      recipientId: uid,
      actorId: c.userId,
      relatedVideoId: c.videoId,
      createdAt: c.createdAt,
    });
  }

  for (const follow of follows) {
    if (isUntrustedActor(follow.follower)) continue;
    const creatorCreatedAt = (follow.creator as { createdAt: Date }).createdAt;
    if (follow.createdAt < creatorCreatedAt) continue;
    items.push({
      id: `follow-${follow.id}`,
      type: 'follow',
      message: `${actor(follow.follower)} started following you`,
      actorName: actor(follow.follower),
      timestamp: timeAgo(follow.createdAt),
      href: `/profile/${follow.follower.username}`,
      recipientId: uid,
      actorId: follow.followerId,
      createdAt: follow.createdAt,
    });
  }

  for (const row of signInAudits) {
    if (!isSignInNotificationRow(row)) continue;
    items.push({
      id: `signin-${row.id}`,
      type: 'security',
      message: signInNotificationMessage(row),
      actorName: 'BETALENT',
      timestamp: timeAgo(row.createdAt),
      href: '/settings',
      recipientId: uid,
      createdAt: row.createdAt,
    });
  }

  for (const gift of gifts) {
    if (isUntrustedActor(gift.sender)) continue;
    const senderName = actor(gift.sender);
    const giftName = gift.gift?.name ?? 'gift';
    const videoId = gift.videoId;
    const hasVideo = videoId != null;
    items.push({
      id: `gift-${gift.id}`,
      type: 'gift',
      message: hasVideo
        ? `${senderName} sent you a ${giftName} gift on your performance`
        : `${senderName} sent you a ${giftName} gift (performance no longer available)`,
      actorName: senderName,
      timestamp: timeAgo(gift.createdAt),
      href: hasVideo ? `/video/${videoId}` : '/wallet',
      recipientId: gift.receiverId,
      actorId: gift.senderId,
      ...(hasVideo ? { relatedVideoId: videoId } : {}),
      relatedGiftId: gift.giftId,
      createdAt: gift.createdAt,
    });
  }

  items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const filtered = items.filter((item) => {
      switch (item.type) {
        case 'vote':
          return prefs.notifyVotes;
        case 'comment':
          return prefs.notifyComments;
        case 'follow':
          return prefs.notifyFollowers;
        case 'gift':
          return prefs.notifyVotes;
        case 'security':
          return true;
        default:
          return true;
      }
    });

    const ids = filtered.map((i) => i.id);
    const reads = ids.length
      ? await prisma.notificationRead.findMany({
          where: { userId: uid, notificationId: { in: ids } },
          select: { notificationId: true, readAt: true },
        })
      : [];
    const readMap = new Map(reads.map((r) => [r.notificationId, r.readAt]));

    const notifications: NotificationPayload[] = filtered.map((item) => ({
      id: item.id,
      type: item.type,
      message: item.message,
      actorName: item.actorName,
      timestamp: item.timestamp,
      href: item.href,
      isRead: readMap.has(item.id),
      readAt: readMap.get(item.id)?.toISOString() ?? null,
      ...(item.recipientId != null && { recipientId: item.recipientId }),
      ...(item.actorId != null && { actorId: item.actorId }),
      ...(item.relatedVideoId != null && { relatedVideoId: item.relatedVideoId }),
      ...(item.relatedGiftId != null && { relatedGiftId: item.relatedGiftId }),
      createdAt: item.createdAt.toISOString(),
    }));
    const unreadCount = notifications.reduce((acc, n) => acc + (n.isRead ? 0 : 1), 0);
    return NextResponse.json({ ok: true, notifications, unreadCount });
  } catch (e) {
    if (isSchemaDriftError(e)) {
      return NextResponse.json(
        { ok: false, message: 'Database schema is out of date for notifications. Run Prisma migrations.' },
        { status: 503 }
      );
    }
    if (isDatabaseUnavailableError(e)) {
      return NextResponse.json({ ok: false, message: 'Service temporarily unavailable' }, { status: 503 });
    }
    return NextResponse.json({ ok: false, message: 'Failed to load notifications' }, { status: 500 });
  }
}
