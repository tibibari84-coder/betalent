import { NextResponse } from 'next/server';
import { getVideoGiftSummary, getRecentVideoGifts } from '@/services/video-gift-summary.service';
import { prisma } from '@/lib/prisma';

export type VideoSupportPayload = {
  totalCoinsReceived: number;
  totalGiftsReceived: number;
  recentGifts: Array<{
    id: string;
    senderName: string;
    giftName: string;
    coinAmount: number;
    createdAt: string;
  }>;
  topSupporters: Array<{
    userId: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    country: string | null;
    totalCoinsSent: number;
    giftsCount: number;
  }>;
};

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const videoId = params.id;
    const exists = await prisma.video.findUnique({
      where: { id: videoId },
      select: { id: true },
    });
    if (!exists) {
      return NextResponse.json({ ok: false, message: 'Video not found' }, { status: 404 });
    }

    const [summary, recentGifts] = await Promise.all([
      getVideoGiftSummary(videoId),
      getRecentVideoGifts(videoId, 10),
    ]);

    const payload: VideoSupportPayload = {
      totalCoinsReceived: summary?.totalCoinsReceived ?? 0,
      totalGiftsReceived: summary?.totalGiftsReceived ?? 0,
      recentGifts,
      topSupporters: summary?.topSupporters ?? [],
    };

    return NextResponse.json({ ok: true, support: payload });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
