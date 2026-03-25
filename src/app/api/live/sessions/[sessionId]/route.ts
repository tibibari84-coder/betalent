/**
 * GET /api/live/sessions/[sessionId]
 * Fetch live session state: status, current performer, leaderboard
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getLiveLeaderboard } from '@/services/live-challenge.service';

export async function GET(
  _req: Request,
  { params }: { params: { sessionId: string } }
) {
  const sessionId = params.sessionId?.trim();
  if (!sessionId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const session = await prisma.liveChallengeSession.findUnique({
    where: { id: sessionId },
    include: {
      challenge: {
        select: { id: true, slug: true, title: true, artistTheme: true },
      },
      slots: {
        include: {
          performer: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              country: true,
            },
          },
          video: {
            select: { id: true, title: true, thumbnailUrl: true, videoUrl: true },
          },
        },
        orderBy: { slotOrder: 'asc' },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const leaderboard = await getLiveLeaderboard(sessionId);

  const currentSlot = session.slots.find(
    (s) => s.performerUserId === session.currentPerformerId
  );

  return NextResponse.json({
    ok: true,
    session: {
      id: session.id,
      status: session.status,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      roundNumber: session.roundNumber,
      currentPerformerId: session.currentPerformerId,
      challenge: session.challenge,
      slots: session.slots.map((s) => ({
        id: s.id,
        performerUserId: s.performerUserId,
        performer: s.performer,
        videoId: s.videoId,
        video: s.video,
        startTime: s.startTime,
        endTime: s.endTime,
        status: s.status,
        slotOrder: s.slotOrder,
      })),
      currentSlot: currentSlot
        ? {
            id: currentSlot.id,
            performer: currentSlot.performer,
            video: currentSlot.video,
            startTime: currentSlot.startTime,
            endTime: currentSlot.endTime,
          }
        : null,
    },
    leaderboard,
  });
}
