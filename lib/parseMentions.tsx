import Link from 'next/link';
import React from 'react';

export function parseMentions(text: string): React.ReactNode[] {
  const parts = text.split(/(@[a-zA-Z0-9_]+)/g);

  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      const username = part.slice(1);
      return (
        <Link
          key={i}
          href={`/users/${username}`}
          onClick={(e) => e.stopPropagation()}
          className="text-[#f5b942] font-medium hover:underline"
        >
          {part}
        </Link>
      );
    }
    return part;
  });
}

export function extractMentionedUsernames(text: string): string[] {
  const matches = text.match(/@([a-zA-Z0-9_]+)/g) ?? [];
  return Array.from(new Set(matches.map((m) => m.slice(1))));
}
