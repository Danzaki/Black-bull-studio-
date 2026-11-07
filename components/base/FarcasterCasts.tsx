'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, MessageCircle } from 'lucide-react';

type CastItem = {
  hash: string;
  text: string;
  timestamp: string | null;
  username: string;
  displayName: string;
  pfp: string | null;
};

function ago(ts: string | null) {
  if (!ts) return '';
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (!(s >= 0)) return '';
  if (s < 3600) return Math.max(1, Math.floor(s / 60)) + 'm';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  return Math.floor(s / 86400) + 'd';
}

export default function FarcasterCasts({ address }: { address: string }) {
  const [casts, setCasts] = useState<CastItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setCasts(null);
    setFailed(false);
    fetch('/api/farcaster/casts?address=' + address)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => {
        if (alive) setCasts(Array.isArray(j?.casts) ? j.casts : []);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [address]);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl =
    'https://warpcast.com/~/compose?text=' +
    encodeURIComponent('Checked this token on Base before buying.') +
    '&embeds[]=' +
    encodeURIComponent(origin + '/base/t/' + address);

  return (
    <div className="rounded-2xl border border-bbl-border p-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1 text-sm font-bold">
          <MessageCircle className="h-4 w-4" /> On Farcaster
        </p>
        <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-bbl-accent underline">
          Cast this check <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {!failed && casts === null && <div className="mt-2 h-20 animate-pulse rounded-xl bg-bbl-text/[0.04]" />}
      {failed && <p className="mt-2 text-xs text-bbl-muted">Farcaster data is unavailable right now.</p>}
      {casts && casts.length === 0 && (
        <p className="mt-2 text-xs text-bbl-muted">No casts found that include this address. Search only finds casts with the full address.</p>
      )}
      {casts && casts.length > 0 && (
        <div className="mt-2 divide-y divide-bbl-border">
          {casts.map((c) => (
            <a
              key={c.hash}
              href={'https://warpcast.com/' + encodeURIComponent(c.username) + '/' + c.hash.slice(0, 10)}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="flex gap-2 py-2"
            >
              {c.pfp ? (
                <img src={c.pfp} alt="" loading="lazy" className="h-7 w-7 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="h-7 w-7 shrink-0 rounded-full bg-bbl-text/10" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs">
                  <span className="font-bold">{c.displayName}</span> <span className="text-bbl-muted">@{c.username} · {ago(c.timestamp)}</span>
                </p>
                <p className="line-clamp-4 whitespace-pre-wrap break-words text-[13px] leading-5">{c.text}</p>
              </div>
            </a>
          ))}
        </div>
      )}
      <p className="mt-2 text-[11px] leading-4 text-bbl-muted">
        Posts are written by other people and are not checked or endorsed by Black Bull. Scammers post here too.
      </p>
    </div>
  );
}
