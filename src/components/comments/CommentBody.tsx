'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';

/**
 * Renders comment text with safe links (http/https only) and @mention links to profile.
 * No raw HTML — text nodes only.
 */
export function CommentBody({
  text,
  className = '',
}: {
  text: string;
  className?: string;
}) {
  if (!text) return null;

  const urlParts = text.split(/(\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)])/gi);
  const nodes: ReactNode[] = [];

  urlParts.forEach((part, i) => {
    if (/^https?:\/\//i.test(part)) {
      let href = part;
      try {
        const u = new URL(part);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error();
        href = u.href;
      } catch {
        nodes.push(<span key={`u-${i}`}>{part}</span>);
        return;
      }
      nodes.push(
        <a
          key={`u-${i}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline underline-offset-2 hover:opacity-90 break-all"
        >
          {part}
        </a>
      );
      return;
    }

    const sub = part.split(/(@[a-zA-Z0-9_]{2,30}\b)/g);
    sub.forEach((chunk, j) => {
      if (chunk.startsWith('@') && chunk.length > 1) {
        const name = chunk.slice(1);
        nodes.push(
          <Link
            key={`m-${i}-${j}`}
            href={`/profile/${encodeURIComponent(name)}`}
            className="text-accent font-medium hover:underline"
          >
            {chunk}
          </Link>
        );
      } else if (chunk) {
        nodes.push(<span key={`t-${i}-${j}`}>{chunk}</span>);
      }
    });
  });

  return <span className={className}>{nodes}</span>;
}
