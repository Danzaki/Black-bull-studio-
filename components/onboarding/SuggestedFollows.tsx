'use client';

import { useEffect, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { VerifiedBadge } from '@/components/community/icons';

type P = { id: string; username: string | null; display_name: string | null; avatar_url: string | null; verified: boolean | null; followers_count: number | null };
const COLS = 'id, username, display_name, avatar_url, verified, followers_count';

export default function SuggestedFollows({ userId, onCount }: { userId: string; onCount?: (n: number) => void }) {
  const supabase = getSupabaseClient();
  const [list, setList] = useState<P[] | null>(null);
  const [on, setOn] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const base = () => supabase.from('profiles').select(COLS).not('username', 'is', null).neq('id', userId);
        const order = { ascending: false, nullsFirst: false };
        const [a, b, f] = await Promise.all([
          base().eq('verified', true).order('followers_count', order).limit(10),
          base().order('followers_count', order).limit(10),
          supabase.from('follows').select('following_id').eq('follower_id', userId),
        ]);
        const followed = new Set(((f.data ?? []) as { following_id: string }[]).map((r) => r.following_id));
        const seen = new Set<string>();
        const out: P[] = [];
        for (const p of [...((a.data ?? []) as P[]), ...((b.data ?? []) as P[])]) {
          if (seen.has(p.id) || followed.has(p.id)) continue;
          seen.add(p.id);
          out.push(p);
          if (out.length === 3) break;
        }
        if (!off) setList(out);
      } catch {
        if (!off) setList([]);
      }
    })();
    return () => { off = true; };
  }, [supabase, userId]);

  useEffect(() => { onCount?.(on.size); }, [on, onCount]);

  async function toggle(id: string) {
    if (busy) return;
    setBusy(id);
    try { navigator.vibrate?.(10); } catch {}
    const was = on.has(id);
    const flip = (v: boolean) => setOn((s) => { const n = new Set(s); if (v) n.add(id); else n.delete(id); return n; });
    flip(!was);
    const { error } = was
      ? await supabase.from('follows').delete().eq('follower_id', userId).eq('following_id', id)
      : await supabase.from('follows').insert({ follower_id: userId, following_id: id });
    if (error && error.code !== '23505') flip(was);
    setBusy(null);
  }

  if (list === null) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-bbl-text/5" />)}</div>;
  }
  if (list.length === 0) return <p className="py-6 text-center text-sm text-bbl-muted">No suggestions yet. You can find people later in Explore.</p>;

  return (
    <div className="space-y-2.5">
      {list.map((p) => {
        const name = p.display_name || p.username || 'User';
        const followed = on.has(p.id);
        return (
          <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-bbl-border bg-bbl-surface p-3">
            {p.avatar_url ? (
              <img src={p.avatar_url} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-bbl-accent text-lg font-bold text-white">{name[0].toUpperCase()}</div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="truncate text-[15px] font-bold">{name}</span>
                {p.verified ? <VerifiedBadge size={14} /> : null}
              </div>
              <p className="truncate text-[13px] text-bbl-muted">@{p.username}{(p.followers_count ?? 0) > 0 ? ' · ' + p.followers_count + ' followers' : ''}</p>
            </div>
            <button type="button" onClick={() => void toggle(p.id)} disabled={busy === p.id}
              className={'flex h-9 shrink-0 items-center gap-1 rounded-full px-4 text-[13px] font-bold transition active:scale-95 ' + (followed ? 'border border-bbl-border text-bbl-text' : 'bg-bbl-accent text-white')}>
              {followed ? <><Check className="h-4 w-4" />Following</> : <><Plus className="h-4 w-4" />Follow</>}
            </button>
          </div>
        );
      })}
    </div>
  );
}
