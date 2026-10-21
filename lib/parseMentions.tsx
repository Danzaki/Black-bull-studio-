import Link from 'next/link';
import React from 'react';

// Ana raba rubutu zuwa: @mentions, #hashtags da $cashtags (dole su fara da harafi, don $5 ko #1 su zama rubutu kawai)
const TOKEN = /(@[a-zA-Z0-9_]+|[#$][a-zA-Z][a-zA-Z0-9_]{1,29})/;
const linkClass = 'text-[#f5b942] font-medium hover:underline';

export function parseMentions(text: string): React.ReactNode[] {
  const parts = text.split(TOKEN);

  return parts.map((part, i) => {
    // Idan ana raba da capture group, abubuwan da suka dace suna a wurare marasa biyu (1, 3, 5...)
    if (i % 2 === 1) {
      if (part.startsWith('@')) {
        const username = part.slice(1);
        return (
          <Link
            key={i}
            href={`/users/${username}`}
            onClick={(e) => e.stopPropagation()}
            className={linkClass}
          >
            {part}
          </Link>
        );
      }
      return (
        <Link
          key={i}
          href={`/search?q=${encodeURIComponent(part)}&tab=posts`}
          onClick={(e) => e.stopPropagation()}
          className={linkClass}
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
