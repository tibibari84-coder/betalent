/**
 * POST /api/contact — inbound messages to operations inbox (Resend/SendGrid).
 * Requires CONTACT_INBOX_EMAIL. No silent success without delivery path configured.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { RATE_LIMIT_CONTACT_PER_IP_PER_HOUR } from '@/constants/api-rate-limits';
import { isTransactionalEmailProviderConfigured, sendTransactionalEmail } from '@/lib/email';

const bodySchema = z.object({
  subject: z.enum(['general', 'support', 'partnership', 'privacy', 'other']),
  email: z.string().email().max(320),
  message: z.string().min(10).max(8000),
});

function contactInbox(): string | null {
  const v = process.env.CONTACT_INBOX_EMAIL?.trim();
  return v || null;
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (
    !(await checkRateLimit('contact-ip', ip, RATE_LIMIT_CONTACT_PER_IP_PER_HOUR, 60 * 60 * 1000))
  ) {
    return NextResponse.json(
      { ok: false, message: 'Too many messages. Please try again later.' },
      { status: 429 }
    );
  }

  const inbox = contactInbox();
  if (!inbox) {
    return NextResponse.json(
      { ok: false, message: 'Contact is not available right now.' },
      { status: 503 }
    );
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    const json = await req.json();
    parsed = bodySchema.parse(json);
  } catch {
    return NextResponse.json(
      { ok: false, message: 'Invalid request. Check subject, email, and message length.' },
      { status: 400 }
    );
  }

  const subjectLine = `[BETALENT contact:${parsed.subject}] ${parsed.email}`;
  const text = `Reply-To / visitor email: ${parsed.email}\nSubject tag: ${parsed.subject}\n\n${parsed.message}`;

  const result = await sendTransactionalEmail({
    to: inbox,
    subject: subjectLine,
    text,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, message: result.error ?? 'Could not send message.' },
      { status: 503 }
    );
  }

  const delivered = isTransactionalEmailProviderConfigured();
  return NextResponse.json({
    ok: true,
    delivered,
    ...(process.env.NODE_ENV !== 'production' && !delivered
      ? { notice: 'Development: email provider not configured; message was logged server-side only.' }
      : {}),
  });
}
