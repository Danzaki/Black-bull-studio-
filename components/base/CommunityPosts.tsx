'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabaseClient';

type Item = { id: string; content: string; created_at: string; name: string; username: string; avatar: string | null };

const EVM_RE = /^0x[a-fA-F0-9]{40}$/;

function ago(ts: string) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (!(s >= 0)) return '';
  if (s < 3600) return Math.max(1, Math.floor(s / 60)) + 'm';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  return Math.floor(s / 86400) + 'd';
}

export default function CommunityPosts({ address }: { address: string }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!EVM_RE.test(address)) return;
    let alive = true;
    setItems(null);
    setFailed(false);
    const supabase = getSupabaseClient();
    supabase
      .from('posts')
      .select('id, content, created_at, profiles(username, display_name, avatar_url)')
      .or('token_mint.ilike.' + address + ',content.ilike.%' + address + '%')
      .order('created_at', { ascending: false })
      .limit(6)
      .then(
        ({ data, error }: { data: any; error: any }) => {
          if (!alive) return;
          if (error) {
            setFailed(true);
            return;
          }
          const list: Item[] = ((data ?? []) as any[]).map((p) => {
            const pr = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
            const av = pr?.avatar_url;
            return {
              id: String(p.id),
              content: String(p.content ?? '').slice(0, 280),
              created_at: String(p.created_at ?? ''),
              name: String(pr?.display_name ?? pr?.username ?? 'User').slice(0, 40),
              username: String(pr?.username ?? 'user'),
              avatar: typeof av === 'string' && /^https:\/\//.test(av) ? av : null,
            };
          });
          setItems(list);
        },
        () => {
          if (alive) setFailed(true);
        }
      );
    return () => {
      alive = false;
    };
  }, [address]);

  if (failed) return null;

  return (
    <div className="rounded-2xl border border-bbl-border p-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1 text-sm font-bold">
          <Users className="h-4 w-4" /> On Black Bull
        </p>
        <Link href="/create-post" className="text-xs font-semibold text-bbl-accent underline">
          Post about it
        </Link>
      </div>
      {items === null && <div className="mt-2 h-16 animate-pulse rounded-xl bg-bbl-text/[0.04]" />}
      {items && items.length === 0 && (
        <p className="mt-2 text-xs text-bbl-muted">No Black Bull posts mention this token yet. Be the first.</p>
      )}
      {items && items.length > 0 && (
        <div className="mt-2 divide-y divide-bbl-border">
          {items.map((p) => (
            <Link key={p.id} href={'/post/' + p.id} className="flex gap-2 py-2">
              {p.avatar ? (
                <img src={p.avatar} alt="" loading="lazy" className="h-7 w-7 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="h-7 w-7 shrink-0 rounded-full bg-bbl-text/10" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs">
                  <span className="font-bold">{p.name}</span> <span className="text-bbl-muted">@{p.username} · {ago(p.created_at)}</span>
                </p>
                <p className="line-clamp-4 whitespace-pre-wrap break-words text-[13px] leading-5">{p.content}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
