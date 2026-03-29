/**
 * GET /api/live/sessions/[sessionId]/stream
 * Server-Sent Events for live session hints (leaderboard refreshes, session transitions).
 *
 * Uses in-process EventEmitter — best-effort only; multiple app instances do not share events.
 * Clients should rely on polling (`LIVE_POLL_INTERVAL_MS`) as the reliable source of truth; see LiveChallengeView.
 */

import { subscribeLiveSession } from '@/lib/live-session-events';
import { prisma } from '@/lib/prisma';
import { getLiveLeaderboard } from '@/services/live-challenge.service';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    await requireAuth();

    const sessionId = params.sessionId?.trim();
    if (!sessionId) {
      return new Response('Missing sessionId', { status: 400 });
    }

    const session = await prisma.liveChallengeSession.findUnique({
      where: { id: sessionId },
      select: { id: true },
    });
    if (!session) {
      return new Response('Session not found', { status: 404 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        const leaderboard = await getLiveLeaderboard(sessionId);
        send({ type: 'init', leaderboard });

        const unsubscribe = subscribeLiveSession(sessionId, (event) => {
          try {
            const { sessionId: _sid, ...rest } = event;
            if (rest.type === 'leaderboard' && 'payload' in rest && rest.payload && typeof rest.payload === 'object') {
              const lb = (rest.payload as { leaderboard?: unknown }).leaderboard;
              if (lb) send({ type: 'leaderboard', leaderboard: lb });
              return;
            }
            if (rest.type === 'session_update' || rest.type === 'current_performer') {
              send(rest);
              return;
            }
            if (rest.type === 'vote' || rest.type === 'gift') {
              getLiveLeaderboard(sessionId).then((lb) => send({ type: 'leaderboard', leaderboard: lb }));
            }
          } catch {
            // ignore
          }
        });

        const keepalive = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(': keepalive\n\n'));
          } catch {
            clearInterval(keepalive);
          }
        }, 15000);

        const originalClose = controller.close?.bind(controller);
        controller.close = () => {
          clearInterval(keepalive);
          unsubscribe();
          originalClose?.();
        };
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return new Response('Unauthorized', { status: 401 });
    }
    return new Response('Stream failed', { status: 500 });
  }
}
