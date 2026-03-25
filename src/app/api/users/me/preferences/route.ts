import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { patchUserPreferencesSchema } from '@/lib/user-preferences';
import { isDatabaseUnavailableError } from '@/lib/db-errors';

const preferencesSelect = {
  profileVisibility: true,
  defaultCommentPermission: true,
  allowVotesOnPerformances: true,
  notifyChallenges: true,
  notifyVotes: true,
  notifyFollowers: true,
  notifyComments: true,
  notifyAnnouncements: true,
} as const;

export async function GET() {
  try {
    const user = await requireAuth();
    const row = await prisma.user.findUnique({
      where: { id: user.id },
      select: preferencesSelect,
    });
    if (!row) {
      return NextResponse.json({ ok: false, message: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, preferences: row });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }
    if (isDatabaseUnavailableError(e)) {
      return NextResponse.json({ ok: false, message: 'Service temporarily unavailable' }, { status: 503 });
    }
    return NextResponse.json({ ok: false, message: 'Failed to load preferences' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAuth();
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 });
    }
    const parsed = patchUserPreferencesSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      return NextResponse.json({ ok: false, message: first?.message ?? 'Invalid body' }, { status: 400 });
    }
    const data = parsed.data;
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ ok: true, message: 'No changes' });
    }
    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
      select: preferencesSelect,
    });
    return NextResponse.json({ ok: true, preferences: updated });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }
    if (isDatabaseUnavailableError(e)) {
      return NextResponse.json({ ok: false, message: 'Service temporarily unavailable' }, { status: 503 });
    }
    return NextResponse.json({ ok: false, message: 'Failed to save preferences' }, { status: 500 });
  }
}
