import { IconBell } from '@/components/ui/Icons';
import NotificationsPageClient from './NotificationsPageClient';

export default function NotificationsPage() {
  return (
    <div className="w-full min-h-[calc(100vh-72px)] pb-24 md:pb-12" style={{ backgroundColor: '#0D0D0E' }}>
      <div className="w-full max-w-[680px] mx-auto px-4 md:px-8 pt-6 md:pt-8">
        <header className="mb-8 md:mb-10">
          <h1 className="font-display text-[36px] font-bold text-text-primary mb-2">Notifications</h1>
          <p className="text-[15px] text-text-secondary">Stay updated with your activity and community.</p>
        </header>

        <NotificationsPageClient />
      </div>
    </div>
  );
}
