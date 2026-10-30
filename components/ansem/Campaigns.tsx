'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Clock, ExternalLink, Trophy, Loader2 } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { compressImage } from '@/lib/compressImage';
import { useAuth } from '@/context/AuthContext';

const card = 'rounded-2xl border border-bbl-border bg-bbl-surface p-4';
const safeLink = (l?: string | null) => (l && /^https:\/\//i.test(l) ? l : null);

function phase(c: any): 'upcoming' | 'live' | 'ended' {
  const now = Date.now();
  if (c.starts_at && now < new Date(c.starts_at).getTime()) return 'upcoming';
  if (c.ends_at && now > new Date(c.ends_at).getTime()) return 'ended';
  return 'live';
}

function Countdown({ c }: { c: any }) {
  const [, tick] = useState(0);
  useEffect(() => { const i = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(i); }, []);
  const p = phase(c);
  if (p === 'ended') return <span>Ended</span>;
  const target = p === 'upcoming' ? c.starts_at : c.ends_at;
  if (!target) return <span>Live now</span>;
  let s = Math.max(0, Math.floor((new Date(target).getTime() - Date.now()) / 1000));
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  return <span className="tabular-nums">{p === 'upcoming' ? 'Starts in ' : 'Ends in '}{d}d {h}h {m}m {s}s</span>;
}

function Detail({ c, onBack }: { c: any; onBack: () => void }) {
  const { userId } = useAuth();
  const supabase = getSupabaseClient();
  const [tasks, setTasks] = useState<any[] | null>(null);
  const [mine, setMine] = useState<Record<string, string>>({});
  const [board, setBoard] = useState<any[]>([]);
  const [links, setLinks] = useState<Record<string, string>>({});
  const [choice, setChoice] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const t = await supabase.from('ansem_campaign_tasks').select('*').eq('campaign_id', c.id).order('sort');
    setTasks(t.data ?? []);
    const b = await supabase.rpc('ansem_leaderboard', { p_campaign: c.id });
    setBoard((b.data as any[]) ?? []);
    if (userId) {
      const m = await supabase.from('ansem_task_completions').select('task_id,status').eq('campaign_id', c.id).eq('user_id', userId);
      const map: Record<string, string> = {};
      (m.data ?? []).forEach((r: any) => { map[r.task_id] = r.status; });
      setMine(map);
    }
  }, [supabase, c.id, userId]);
  useEffect(() => { void load(); }, [load]);

  async function submit(task: any, proof: string | null) {
    if (!userId) { setMsg('Sign in to take part.'); return; }
    setBusy(task.id); setMsg('');
    const { error } = await supabase.from('ansem_task_completions').insert({ task_id: task.id, user_id: userId, proof });
    setBusy('');
    if (error) setMsg(error.message.includes('duplicate') ? 'This was already submitted.' : error.message);
    else await load();
  }

  async function shot(task: any, file: File | undefined) {
    if (!file || !userId) return;
    if (!file.type.startsWith('image/')) { setMsg('Choose an image.'); return; }
    setBusy(task.id); setMsg('');
    let f: File;
    try { f = await compressImage(file, 1280, 0.8); } catch { setBusy(''); setMsg('Could not read the image.'); return; }
    const path = `${userId}/${crypto.randomUUID()}.jpg`;
    const up = await supabase.storage.from('ansem-proofs').upload(path, f, { contentType: 'image/jpeg' });
    if (up.error) { setBusy(''); setMsg(up.error.message); return; }
    await submit(task, path);
  }

  async function answer(task: any) {
    if (!userId) { setMsg('Sign in to take part.'); return; }
    const n = choice[task.id];
    if (n === undefined) { setMsg('Choose an answer.'); return; }
    setBusy(task.id); setMsg('');
    const { data, error } = await supabase.rpc('ansem_submit_quiz', { p_task: task.id, p_choice: n });
    setBusy('');
    if (error) { setMsg(error.message); return; }
    if (data === 'correct') await load();
    else setMsg(data === 'wrong' ? 'Wrong answer. Try again.' : data === 'locked' ? 'No attempts left.' : 'This campaign is not active.');
  }

  const p = phase(c);
  const myPoints = (tasks ?? []).reduce((n, t) => n + (mine[t.id] === 'approved' ? t.points : 0), 0);

  return (
    <div className="space-y-3">
      <button onClick={onBack} className="flex items-center gap-1 text-sm font-semibold text-bbl-muted"><ArrowLeft className="h-4 w-4" /> All campaigns</button>
      <div className={card}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-lg font-black">{c.title}</p>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${p === 'live' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-bbl-text/5 text-bbl-muted'}`}>{p}</span>
        </div>
        <p className="mt-1 whitespace-pre-wrap text-sm text-bbl-muted">{c.description}</p>
        <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold"><Clock className="h-3.5 w-3.5 text-bbl-accent" /><Countdown c={c} /></p>
        {c.reward && <p className="mt-2 rounded-xl bg-bbl-bg px-3 py-2 text-xs"><b>Reward:</b> {c.reward}</p>}
        {userId && <p className="mt-2 text-xs text-bbl-muted">Your points: <b className="text-bbl-text tabular-nums">{myPoints}</b></p>}
      </div>

      {msg && <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-600">{msg}</p>}
      {tasks === null ? <div className={card + ' h-24 animate-pulse'} /> : tasks.map((t) => {
        const st = mine[t.id];
        const isX = String(t.kind).startsWith('x_');
        return (
          <div key={t.id} className={card + ' space-y-2'}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-bold">{t.title}</p>
              <span className="shrink-0 rounded-full bg-bbl-accent/10 px-2 py-0.5 text-[11px] font-bold text-bbl-accent">+{t.points}</span>
            </div>
            {!t.required && <p className="text-[11px] text-bbl-muted">Optional</p>}
            {st ? (
              <p className={`flex items-center gap-1.5 text-xs font-semibold ${st === 'approved' ? 'text-emerald-600' : st === 'rejected' ? 'text-rose-600' : 'text-bbl-muted'}`}>
                {st === 'approved' && <Check className="h-3.5 w-3.5" />}{st === 'approved' ? 'Done' : st === 'rejected' ? 'Rejected' : 'Pending review'}
              </p>
            ) : p !== 'live' ? <p className="text-xs text-bbl-muted">Not active</p> : (
              <div className="space-y-2">
                {isX && safeLink(t.url) && (
                  <a href={safeLink(t.url)!} target="_blank" rel="noopener noreferrer nofollow" className="flex h-10 items-center justify-center gap-1.5 rounded-full border border-bbl-border text-sm font-semibold active:scale-95">Open on X <ExternalLink className="h-3.5 w-3.5" /></a>
                )}
                {(t.kind === 'x_follow' || t.kind === 'x_like') && (
                  <label className="flex h-10 cursor-pointer items-center justify-center rounded-full bg-bbl-accent text-sm font-bold text-white active:scale-95">
                    {busy === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Upload screenshot'}
                    <input type="file" accept="image/*" className="hidden" disabled={busy === t.id} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; void shot(t, f); }} />
                  </label>
                )}
                {(t.kind === 'x_comment' || t.kind === 'x_repost') && (
                  <>
                    <input value={links[t.id] ?? ''} onChange={(e) => setLinks((s) => ({ ...s, [t.id]: e.target.value }))} placeholder="Link to your comment or repost" maxLength={300}
                      className="h-11 w-full rounded-xl border border-bbl-border bg-bbl-bg px-3 text-base outline-none focus:border-bbl-accent" />
                    <button onClick={() => void submit(t, (links[t.id] ?? '').trim())} disabled={busy === t.id} className="flex h-10 w-full items-center justify-center rounded-full bg-bbl-accent text-sm font-bold text-white active:scale-95 disabled:opacity-50">
                      {busy === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit link'}
                    </button>
                  </>
                )}
                {t.kind === 'quiz' && (
                  <>
                    <p className="text-sm">{t.question}</p>
                    {(Array.isArray(t.options) ? t.options : []).map((o: string, k: number) => (
                      <button key={k} onClick={() => setChoice((s) => ({ ...s, [t.id]: k }))}
                        className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm active:scale-[0.99] ${choice[t.id] === k ? 'border-bbl-accent bg-bbl-accent/10 font-semibold' : 'border-bbl-border'}`}>{o}</button>
                    ))}
                    <button onClick={() => void answer(t)} disabled={busy === t.id} className="flex h-10 w-full items-center justify-center rounded-full bg-bbl-accent text-sm font-bold text-white active:scale-95 disabled:opacity-50">
                      {busy === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit answer'}
                    </button>
                    <p className="text-[11px] text-bbl-muted">3 attempts per quiz.</p>
                  </>
                )}
                {t.kind === 'post' && <Link href="/create-post" className="flex h-10 items-center justify-center rounded-full border border-bbl-border text-sm font-semibold active:scale-95">Write a post with {t.tag}</Link>}
                {t.kind === 'post' && (
                  <button onClick={() => void submit(t, null)} disabled={busy === t.id} className="flex h-10 w-full items-center justify-center rounded-full bg-bbl-accent text-sm font-bold text-white active:scale-95 disabled:opacity-50">
                    {busy === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify my post'}
                  </button>
                )}
                {String(t.kind).startsWith('app_') && <p className="text-xs text-bbl-muted">Coming soon.</p>}
              </div>
            )}
          </div>
        );
      })}
      <p className="px-1 text-[11px] text-bbl-muted">Screenshots and links are reviewed by hand. Fake or reused proof is rejected.</p>

      <div className={card}>
        <p className="mb-2 flex items-center gap-2 text-sm font-bold"><Trophy className="h-4 w-4 text-bbl-accent" /> Leaderboard</p>
        {board.length === 0 ? <p className="text-sm text-bbl-muted">No points yet. Be the first.</p> : board.map((r, i) => (
          <Link key={r.user_id} href={`/users/${r.username}`} className="flex items-center gap-3 border-t border-bbl-border py-2 first:border-t-0">
            <span className="w-6 text-center text-sm font-black tabular-nums">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{r.display_name || r.username}</span>
            <span className="text-sm font-bold tabular-nums">{r.points}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function Campaigns() {
  const supabase = getSupabaseClient();
  const [rows, setRows] = useState<any[] | null>(null);
  const [open, setOpen] = useState<any | null>(null);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('ansem_campaigns').select('*').eq('status', 'published').order('created_at', { ascending: false }).limit(30);
      setRows(data ?? []);
    })();
  }, [supabase]);
  if (open) return <Detail c={open} onBack={() => setOpen(null)} />;
  if (rows === null) return <div className={card + ' h-24 animate-pulse'} />;
  if (rows.length === 0) return <div className={card + ' text-center text-sm text-bbl-muted'}>No campaigns yet.</div>;
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <button key={r.id} onClick={() => setOpen(r)} className={card + ' block w-full text-left active:scale-[0.99]'}>
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold">{r.title}</p>
            <span className="text-[11px] font-bold uppercase text-bbl-accent">{phase(r)}</span>
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-bbl-muted">{r.description}</p>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-bbl-muted"><Clock className="h-3.5 w-3.5" /><Countdown c={r} /></p>
        </button>
      ))}
    </div>
  );
}
