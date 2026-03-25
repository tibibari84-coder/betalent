import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { requireAuth } from '@/lib/auth';
import { userMeUpdateSchema } from '@/lib/validations';
import { isDatabaseUnavailableError } from '@/lib/db-errors';

/**
 * PATCH /api/users/me – Update current user (preferredLocale, displayName, bio, country/countryCode).
 * Updates session.user.locale when preferredLocale changes.
 */
export async function PATCH(request: Request) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = userMeUpdateSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    const message = first?.message ?? 'Invalid request body';
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }

  const data = parsed.data;
  const update: {
    preferredLocale?: string;
    displayName?: string;
    bio?: string | null;
    country?: string | null;
    avatarUrl?: string | null;
  } = {};

  if (data.preferredLocale !== undefined) {
    update.preferredLocale = data.preferredLocale;
  }
  if (data.displayName !== undefined) {
    const trimmed = data.displayName.trim();
    update.displayName = trimmed || user.username;
  }
  if (data.bio !== undefined) {
    update.bio = data.bio?.trim() || null;
  }
  if (data.country !== undefined) {
    update.country = data.country?.trim() || null;
  }
  if (data.countryCode !== undefined) {
    update.country = data.countryCode?.trim().toUpperCase() || null;
  }
  if (data.avatarUrl !== undefined) {
    update.avatarUrl = data.avatarUrl?.trim() || null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true });
  }

  try {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: update,
      select: {
        displayName: true,
        bio: true,
        country: true,
        avatarUrl: true,
        preferredLocale: true,
      },
    });

    if (update.preferredLocale) {
      const session = await getSession();
      if (session.user) {
        session.user.locale = update.preferredLocale;
        await session.save();
      }
    }

    return NextResponse.json({ ok: true, user: updated });
  } catch (e) {
    if (isDatabaseUnavailableError(e)) {
      return NextResponse.json({ ok: false, message: 'Service temporarily unavailable' }, { status: 503 });
    }
    return NextResponse.json({ ok: false, message: 'Failed to update profile' }, { status: 500 });
  }
}
