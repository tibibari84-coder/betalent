import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await getSession();
  const isAppMember = Boolean(session.user && !session.pending2FAUserId && session.user.emailVerified);

  if (isAppMember) {
    redirect('/feed');
  }
  redirect('/welcome');
}
