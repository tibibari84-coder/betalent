'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { IconArrowLeft } from '@/components/ui/Icons';
import { DmThreadView } from '@/components/chat/DmThreadView';
import { useChatPanelOptional } from '@/contexts/ChatPanelContext';
import { inboxListPath } from '@/lib/chat-navigation';
import type { DmPeerSummary } from '@/contexts/ChatPanelContext';

export default function InboxThreadClient({
  peerId,
  peerHint,
}: {
  peerId: string;
  peerHint: DmPeerSummary | null;
}) {
  const router = useRouter();
  const chatPanel = useChatPanelOptional();

  return (
    <div className="relative flex h-[100dvh] w-full min-w-0 flex-col overflow-hidden bg-[#050505]">
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 90% 55% at 50% -15%, rgba(196,18,47,0.12), transparent 55%), radial-gradient(ellipse 70% 45% at 100% 100%, rgba(130,30,52,0.08), transparent 60%)',
        }}
      />
      <header
        className="relative z-10 flex shrink-0 items-center gap-2 border-b border-white/[0.08] px-2 py-2"
        style={{ paddingTop: 'max(8px, env(safe-area-inset-top))' }}
      >
        <button
          type="button"
          onClick={() => router.push(inboxListPath())}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white/85 transition-colors hover:bg-white/[0.06]"
          aria-label="Back to inbox"
        >
          <IconArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-[17px] font-semibold text-white">
            {peerHint?.displayName || peerHint?.username || 'Messages'}
          </h1>
          {peerHint?.username ? (
            <Link
              href={`/profile/${encodeURIComponent(peerHint.username)}`}
              className="truncate text-[12px] text-white/45 hover:text-accent"
            >
              @{peerHint.username}
            </Link>
          ) : null}
        </div>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <DmThreadView
          peerId={peerId}
          peerHint={peerHint}
          showProfileLink={false}
          onClosePanel={chatPanel ? () => chatPanel.closePanel() : undefined}
          refreshUnread={chatPanel?.refreshDmUnread}
          pollIntervalMs={3200}
          className="min-h-0 flex-1"
        />
      </div>
    </div>
  );
}
