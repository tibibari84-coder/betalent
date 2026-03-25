import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';

/**
 * /profile/me – Redirect to the current user's profile.
 * If not authenticated, middleware already redirected to /login.
 */
export default async function ProfileMePage() {
  const session = await getSession();
  if (!session?.user?.username) {
    redirect('/login');
  }
  redirect(`/profile/${session.user.username}`);
}
