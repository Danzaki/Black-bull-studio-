'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';

type P = { id: string; username: string | null; display_name: string | null; avatar_url: string | null };
type Kind = 'blocked' | 'muted';
const CFG = {
  blocked: { table: 'user_blocks', me: 'blocker_id', other: 'blocked_id', undo: 'Unblock', empty: 'You have not blocked anyone.' },
  muted: { table: 'user_mutes', me: 'muter_id', other: 'muted_id', undo: 'Unmute', empty: 'You have not muted anyone.' },
};

export default function BlockedPage() {
  const supabase = getSupabaseClient();
  const qc = useQueryClient();
  const { userId } = useAuth();
  const [tab, setTab] = useState<Kind>('blocked');
  const [list, setList] = useState<P[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    if (!userId) return;
    const c = CFG[tab];
    setList(null);
    setErr('');
    const { data, error } = await supabase.from(c.table).select(c.other).eq(c.me, userId);
    if (error) { setErr(error.message); setList([]); return; }
    const ids = ((data ?? []) as Record<string, string>[]).map((r) => r[c.other]);
    if (ids.length === 0) { setList([]); return; }
    const { data: ps } = await supabase.from('profiles').select('id, username, display_name, avatar_url').in('id', ids);
    setList((ps ?? []) as P[]);
  }, [supabase, userId, tab]);

  useEffect(() => { void load(); }, [load]);

  async function undo(id: string) {
    if (!userId || busy) return;
    const c = CFG[tab];
    setBusy(id);
    const { error } = await supabase.from(c.table).delete().eq(c.me, userId).eq(c.other, id);
    setBusy(null);
    if (error) { setErr(error.message); return; }
    setList((l) => (l ? l.filter((p) => p.id !== id) : l));
    void qc.invalidateQueries({ queryKey: ['hidden-users', userId] });
  }

  const tabCls = (k: Kind) => 'flex-1 min-h-[44px] border-b-2 text-[14px] font-semibold ' + (tab === k ? 'border-bbl-accent text-bbl-text' : 'border-transparent text-bbl-muted');

  return (
    <main className="min-h-screen bg-bbl-bg text-bbl-text [color-scheme:light]">
      <div className="mx-auto max-w-2xl">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-bbl-border bg-bbl-bg/95 px-2 backdrop-blur-xl">
          <Link href="/settings" aria-label="Back" className="flex h-11 w-11 items-center justify-center rounded-full active:bg-bbl-text/5">
            <ArrowLeft className="h-[22px] w-[22px]" />
          </Link>
          <h1 className="text-[17px] font-bold">Blocked and muted</h1>
        </header>
        <div className="flex border-b border-bbl-border">
          <button type="button" onClick={() => setTab('blocked')} className={tabCls('blocked')}>Blocked</button>
          <button type="button" onClick={() => setTab('muted')} className={tabCls('muted')}>Muted</button>
        </div>
        {err ? <p className="p-4 text-sm text-bbl-like">{err}</p> : null}
        {list === null ? (
          <div className="animate-pulse space-y-3 p-4">{[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-xl bg-bbl-text/5" />)}</div>
        ) : list.length === 0 ? (
          <p className="p-10 text-center text-sm text-bbl-muted">{CFG[tab].empty}</p>
        ) : (
          list.map((p) => {
            const name = p.display_name || p.username || 'User';
            return (
              <div key={p.id} className="flex items-center gap-3 border-b border-bbl-border px-3 py-3">
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-bbl-accent font-bold text-white">{name[0].toUpperCase()}</div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold">{name}</p>
                  <p className="truncate text-[13px] text-bbl-muted">@{p.username}</p>
                </div>
                <button type="button" onClick={() => void undo(p.id)} disabled={busy === p.id} className="h-9 rounded-full border border-bbl-border px-4 text-[13px] font-bold active:scale-95 disabled:opacity-50">
                  {CFG[tab].undo}
                </button>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
