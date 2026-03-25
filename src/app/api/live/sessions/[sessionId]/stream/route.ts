/**
 * GET /api/live/sessions/[sessionId]/stream
 * Server-Sent Events stream for real-time session updates
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
    // Auth requirement: `sessionId` alone must not allow subscriptions.
    // We require a valid app session cookie (same pattern as other protected live endpoints).
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
            if (event.type === 'leaderboard' && 'payload' in event) {
              send(event.payload);
            } else if (event.type === 'vote' || event.type === 'gift') {
              getLiveLeaderboard(sessionId).then((lb) => send({ leaderboard: lb }));
            }
          }
          catch {
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

        // Cleanup on close (Next.js may not always call this)
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
