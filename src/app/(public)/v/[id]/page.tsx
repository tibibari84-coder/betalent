/**
 * Short deep link: /v/[id] -> /video/[id]
 * Preserves ?ref= for referral attribution. Used for share links.
 */
import { redirect } from 'next/navigation';

interface Props {
  params: { id: string };
  searchParams: { ref?: string };
}

export default function VideoDeepLinkPage({ params, searchParams }: Props) {
  const ref = searchParams?.ref;
  const base = `/video/${params.id}`;
  const url = ref ? `${base}?ref=${encodeURIComponent(ref)}` : base;
  redirect(url);
}
