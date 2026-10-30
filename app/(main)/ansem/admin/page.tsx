'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Check, X } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabaseClient';

const KINDS: [string, string][] = [
  ['quiz', 'Quiz'],
  ['x_follow', 'X: Follow (screenshot)'],
  ['x_like', 'X: Like (screenshot)'],
  ['x_comment', 'X: Comment (link)'],
  ['x_repost', 'X: Repost (link)'],
  ['post', 'In-app: Post with tag'],
];
const card = 'rounded-2xl border border-bbl-border bg-bbl-surface p-4';
const inp = 'h-11 w-full rounded-xl border border-bbl-border bg-bbl-bg px-3 text-base outline-none focus:border-bbl-accent';
const local = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const blank = () => ({ kind: 'x_follow', title: '', url: '', tag: '', points: 10, required: true, question: '', options: ['', '', '', ''], correct: 0 });

export default function AnsemAdmin() {
  const supabase = getSupabaseClient();
  const [ok, setOk] = useState<boolean | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reward, setReward] = useState('');
  const [startsAt, setStartsAt] = useState(local(new Date()));
  const [endsAt, setEndsAt] = useState('');
  const [tasks, setTasks] = useState<any[]>([blank()]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [camps, setCamps] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [shot, setShot] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    const c = await supabase.from('ansem_campaigns').select('id,title,status,ends_at').order('created_at', { ascending: false }).limit(30);
    setCamps(c.data ?? []);
    const q = await supabase.from('ansem_task_completions').select('id,proof,task_id,user_id,created_at').eq('status', 'pending').order('created_at').limit(50);
    const rows: any[] = q.data ?? [];
    if (rows.length === 0) { setQueue([]); return; }
    const t = await supabase.from('ansem_campaign_tasks').select('id,title,kind').in('id', Array.from(new Set(rows.map((r) => r.task_id))));
    const p = await supabase.from('profiles').select('id,username').in('id', Array.from(new Set(rows.map((r) => r.user_id))));
    const tm: Record<string, any> = {}; (t.data ?? []).forEach((x: any) => { tm[x.id] = x; });
    const pm: Record<string, any> = {}; (p.data ?? []).forEach((x: any) => { pm[x.id] = x; });
    setQueue(rows.map((r) => ({ ...r, task: tm[r.task_id], user: pm[r.user_id] })));
  }, [supabase]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc('is_ansem_admin');
      setOk(data === true);
      if (data === true) await loadAll();
    })();
  }, [supabase, loadAll]);

  function setTask(i: number, patch: any) { setTasks((ts) => ts.map((t, j) => (j === i ? { ...t, ...patch } : t))); }

  async function save(publish: boolean) {
    setMsg('');
    if (!title.trim() || !description.trim()) return setMsg('Title and description are required.');
    if (tasks.length === 0) return setMsg('Add at least one task.');
    for (const t of tasks) {
      if (!t.title.trim()) return setMsg('Every task needs a title.');
      if (!(t.points >= 1 && t.points <= 1000)) return setMsg('Points must be between 1 and 1000.');
      if (t.kind.startsWith('x_') && !/^https:\/\//i.test(t.url.trim())) return setMsg(`"${t.title}" needs an https:// link.`);
      if (t.kind === 'post' && !t.tag.trim()) return setMsg(`"${t.title}" needs a tag, for example #BlackBull.`);
      if (t.kind === 'quiz') {
        if (!t.question.trim() || t.options.filter((o: string) => o.trim()).length < 2) return setMsg('A quiz needs a question and at least 2 options.');
        if (!t.options[t.correct]?.trim()) return setMsg('Choose a correct answer that is not empty.');
      }
    }
    setBusy(true);
    const c = await supabase.from('ansem_campaigns').insert({
      title: title.trim(), description: description.trim(), reward: reward.trim() || null,
      starts_at: new Date(startsAt).toISOString(), ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      status: publish ? 'published' : 'draft',
    }).select('id').single();
    if (c.error || !c.data) { setBusy(false); return setMsg(c.error?.message ?? 'Could not save.'); }
    const rows = tasks.map((t, i) => ({
      campaign_id: c.data.id, kind: t.kind, title: t.title.trim(),
      url: t.kind.startsWith('x_') ? t.url.trim() : null,
      tag: t.kind === 'post' ? t.tag.trim() : null,
      points: Number(t.points), required: t.required, sort: i,
      question: t.kind === 'quiz' ? t.question.trim() : null,
      options: t.kind === 'quiz' ? t.options.map((o: string) => o.trim()).filter(Boolean) : null,
    }));
    const ins = await supabase.from('ansem_campaign_tasks').insert(rows).select('id,kind');
    if (ins.error || !ins.data) { setBusy(false); return setMsg(ins.error?.message ?? 'Could not save tasks.'); }
    const answers = tasks.map((t, i) => ({ t, id: (ins.data as any[])[i]?.id })).filter((x) => x.t.kind === 'quiz').map((x) => ({
      task_id: x.id, correct: x.t.options.slice(0, x.t.correct).filter((o: string) => o.trim()).length,
    }));
    if (answers.length) {
      const a = await supabase.from('ansem_quiz_answers').insert(answers);
      if (a.error) { setBusy(false); return setMsg(a.error.message); }
    }
    setBusy(false);
    setTitle(''); setDescription(''); setReward(''); setEndsAt(''); setTasks([blank()]);
    setMsg(publish ? 'Published.' : 'Saved as draft.');
    await loadAll();
  }

  async function toggle(c: any) {
    await supabase.from('ansem_campaigns').update({ status: c.status === 'published' ? 'draft' : 'published' }).eq('id', c.id);
    await loadAll();
  }
  async function del(c: any) {
    if (!window.confirm('Delete this campaign and all its data?')) return;
    await supabase.from('ansem_campaigns').delete().eq('id', c.id);
    await loadAll();
  }
  async function review(id: string, status: 'approved' | 'rejected') {
    await supabase.from('ansem_task_completions').update({ status }).eq('id', id);
    setShot(null);
    await loadAll();
  }
  async function view(path: string) {
    const { data } = await supabase.storage.from('ansem-proofs').createSignedUrl(path, 300);
    setShot(data?.signedUrl ?? null);
  }

  if (ok === null) return <div className="p-4"><div className={card + ' h-24 animate-pulse'} /></div>;
  if (!ok) return <div className="p-4"><div className={card + ' text-sm text-bbl-muted'}>You do not have access to this page.</div></div>;

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <h1 className="text-xl font-black">Ansem admin</h1>

      <div className={card + ' space-y-2'}>
        <p className="text-sm font-bold">New campaign</p>
        <input className={inp} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" maxLength={80} />
        <textarea className={inp + ' h-24 resize-none py-2'} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" maxLength={500} />
        <input className={inp} value={reward} onChange={(e) => setReward(e.target.value)} placeholder="Reward (only what you will really give)" maxLength={200} />
        <label className="block text-xs text-bbl-muted">Starts<input type="datetime-local" className={inp} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} /></label>
        <label className="block text-xs text-bbl-muted">Ends (optional)<input type="datetime-local" className={inp} value={endsAt} onChange={(e) => setEndsAt(e.target.value)} /></label>

        {tasks.map((t, i) => (
          <div key={i} className="space-y-2 rounded-xl border border-bbl-border p-3">
            <div className="flex items-center gap-2">
              <select className={inp} value={t.kind} onChange={(e) => setTask(i, { kind: e.target.value })}>
                {KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              <button onClick={() => setTasks((ts) => ts.filter((_, j) => j !== i))} aria-label="Remove task" className="shrink-0 text-bbl-muted active:text-rose-500"><Trash2 className="h-4 w-4" /></button>
            </div>
            <input className={inp} value={t.title} onChange={(e) => setTask(i, { title: e.target.value })} placeholder="Task title, e.g. Follow @account on X" maxLength={120} />
            {t.kind.startsWith('x_') && <input className={inp} value={t.url} onChange={(e) => setTask(i, { url: e.target.value })} placeholder="X link users should open (https://...)" maxLength={200} />}
            {t.kind === 'post' && <input className={inp} value={t.tag} onChange={(e) => setTask(i, { tag: e.target.value })} placeholder="Required tag, e.g. #BlackBull" maxLength={40} />}
            {t.kind === 'quiz' && (
              <div className="space-y-2">
                <input className={inp} value={t.question} onChange={(e) => setTask(i, { question: e.target.value })} placeholder="Question" maxLength={200} />
                {t.options.map((o: string, k: number) => (
                  <div key={k} className="flex items-center gap-2">
                    <input type="radio" name={`c${i}`} checked={t.correct === k} onChange={() => setTask(i, { correct: k })} className="h-4 w-4 accent-orange-500" />
                    <input className={inp} value={o} onChange={(e) => setTask(i, { options: t.options.map((x: string, m: number) => (m === k ? e.target.value : x)) })} placeholder={`Option ${k + 1}`} maxLength={100} />
                  </div>
                ))}
                <p className="text-[11px] text-bbl-muted">Select the circle next to the correct answer.</p>
              </div>
            )}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-bbl-muted">Points
                <input type="number" min={1} max={1000} className="h-10 w-20 rounded-xl border border-bbl-border bg-bbl-bg px-2 text-base" value={t.points} onChange={(e) => setTask(i, { points: Number(e.target.value) })} />
              </label>
              <label className="flex items-center gap-2 text-xs text-bbl-muted"><input type="checkbox" checked={t.required} onChange={(e) => setTask(i, { required: e.target.checked })} className="h-4 w-4 accent-orange-500" /> Required</label>
            </div>
          </div>
        ))}
        <button onClick={() => setTasks((ts) => [...ts, blank()])} className="flex h-10 w-full items-center justify-center gap-1.5 rounded-full border border-bbl-border text-sm font-semibold active:scale-95"><Plus className="h-4 w-4" /> Add task</button>
        {msg && <p className={`text-xs ${msg === 'Published.' || msg === 'Saved as draft.' ? 'text-emerald-600' : 'text-rose-500'}`}>{msg}</p>}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => save(false)} disabled={busy} className="h-11 rounded-full border border-bbl-border text-sm font-bold active:scale-95 disabled:opacity-50">Save draft</button>
          <button onClick={() => save(true)} disabled={busy} className="h-11 rounded-full bg-bbl-accent text-sm font-bold text-white active:scale-95 disabled:opacity-50">Publish</button>
        </div>
      </div>

      <div className={card + ' space-y-2'}>
        <p className="text-sm font-bold">Campaigns</p>
        {camps.length === 0 && <p className="text-sm text-bbl-muted">None yet.</p>}
        {camps.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-2 border-t border-bbl-border pt-2 first:border-t-0 first:pt-0">
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{c.title}</p><p className="text-[11px] uppercase text-bbl-muted">{c.status}</p></div>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => toggle(c)} className="rounded-full border border-bbl-border px-3 py-1.5 text-xs font-semibold active:scale-95">{c.status === 'published' ? 'Unpublish' : 'Publish'}</button>
              <button onClick={() => del(c)} aria-label="Delete" className="text-bbl-muted active:text-rose-500"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>

      <div className={card + ' space-y-3'}>
        <p className="text-sm font-bold">Waiting for review ({queue.length})</p>
        {shot && <img src={shot} alt="Proof" className="max-h-96 w-full rounded-xl border border-bbl-border object-contain" />}
        {queue.length === 0 && <p className="text-sm text-bbl-muted">Nothing to review.</p>}
        {queue.map((r) => {
          const isLink = r.task?.kind === 'x_comment' || r.task?.kind === 'x_repost';
          return (
            <div key={r.id} className="space-y-2 border-t border-bbl-border pt-3 first:border-t-0 first:pt-0">
              <p className="text-sm"><b>@{r.user?.username ?? 'user'}</b>: {r.task?.title}</p>
              {isLink && /^https:\/\//i.test(r.proof ?? '') ? <a href={r.proof} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-xs text-bbl-accent underline">{r.proof}</a>
                : <button onClick={() => view(r.proof)} className="text-xs font-semibold text-bbl-accent underline">View screenshot</button>}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => review(r.id, 'approved')} className="flex h-10 items-center justify-center gap-1 rounded-full bg-emerald-600 text-sm font-bold text-white active:scale-95"><Check className="h-4 w-4" /> Approve</button>
                <button onClick={() => review(r.id, 'rejected')} className="flex h-10 items-center justify-center gap-1 rounded-full border border-bbl-border text-sm font-bold active:scale-95"><X className="h-4 w-4" /> Reject</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
