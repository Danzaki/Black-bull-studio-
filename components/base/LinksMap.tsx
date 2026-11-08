'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, Link2, RefreshCw } from 'lucide-react';

type Kind = 'wallet' | 'contract' | 'locked';
type NodeT = { address: string; pct: number; kind: Kind; tag: string | null; cluster: string };
type LinkT = { a: string; b: string; count: number; tx: string };
type Cluster = { id: string; size: number; pct: number };
type Data = {
  address: string;
  updatedAt: number;
  nodes: NodeT[];
  links: LinkT[];
  clusters: Cluster[];
  totalPct: number;
  failed?: number;
  note?: string;
};
type P = { x: number; y: number; r: number };

const W = 360;
const H = 380;
const PALETTE = ['#38bdf8', '#fb923c', '#c084fc', '#f472b6', '#2dd4bf', '#facc15'];
const SOLO = '#7c93b8';
const CONTRACT = '#64748b';
const LOCKED = '#34d399';
const short = (a: string) => a.slice(0, 6) + '…' + a.slice(-4);

function ago(ms: number, now: number) {
  const s = Math.max(0, Math.floor((now - ms) / 1000));
  if (s < 10) return 'just now';
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  return Math.floor(s / 3600) + 'h ago';
}

function layout(nodes: NodeT[], links: LinkT[]): Map<string, P> {
  const out = new Map<string, P>();
  if (nodes.length === 0) return out;
  const maxPct = Math.max(...nodes.map((n) => n.pct));
  const sum = nodes.reduce((s, n) => s + n.pct, 0);
  const k = Math.min(60 / Math.sqrt(maxPct), Math.sqrt((0.3 * W * H) / (Math.PI * sum)));
  const ps: P[] = nodes.map((n, i) => {
    const ang = i * 2.399963;
    const rad = 20 + 14 * Math.sqrt(i);
    return { x: W / 2 + rad * Math.cos(ang), y: H / 2 + rad * Math.sin(ang), r: Math.max(9, k * Math.sqrt(n.pct)) };
  });
  const idx = new Map<string, number>(nodes.map((n, i) => [n.address, i]));
  const pairs: [number, number][] = [];
  for (const l of links) {
    const a = idx.get(l.a);
    const b = idx.get(l.b);
    if (a !== undefined && b !== undefined) pairs.push([a, b]);
  }
  for (let it = 0; it < 300; it++) {
    for (const p of ps) {
      p.x += (W / 2 - p.x) * 0.015;
      p.y += (H / 2 - p.y) * 0.015;
    }
    for (const [a, b] of pairs) {
      const p = ps[a];
      const q = ps[b];
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      const f = (d - (p.r + q.r + 26)) * 0.05;
      p.x += (dx / d) * f;
      p.y += (dy / d) * f;
      q.x -= (dx / d) * f;
      q.y -= (dy / d) * f;
    }
    for (let i = 0; i < ps.length; i++) {
      for (let j = i + 1; j < ps.length; j++) {
        const p = ps[i];
        const q = ps[j];
        let dx = q.x - p.x;
        let dy = q.y - p.y;
        let d = Math.hypot(dx, dy);
        if (d < 0.01) {
          dx = 1;
          dy = 0;
          d = 1;
        }
        const min = p.r + q.r + 6;
        if (d < min) {
          const push = (min - d) / 2;
          p.x -= (dx / d) * push;
          p.y -= (dy / d) * push;
          q.x += (dx / d) * push;
          q.y += (dy / d) * push;
        }
      }
    }
    for (const p of ps) {
      p.x = Math.min(W - p.r - 4, Math.max(p.r + 4, p.x));
      p.y = Math.min(H - p.r - 4, Math.max(p.r + 4, p.y));
    }
  }
  nodes.forEach((n, i) => out.set(n.address, ps[i]));
  return out;
}

function ropePath(p: P, q: P) {
  const d = Math.hypot(q.x - p.x, q.y - p.y) || 1;
  const mx = (p.x + q.x) / 2;
  const my = (p.y + q.y) / 2 + Math.min(22, d * 0.18);
  return 'M' + p.x.toFixed(1) + ',' + p.y.toFixed(1) + ' Q' + mx.toFixed(1) + ',' + my.toFixed(1) + ' ' + q.x.toFixed(1) + ',' + q.y.toFixed(1);
}

export default function LinksMap({ address }: { address: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [data, setData] = useState<Data | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [auto, setAuto] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setData(null);
    setSel(null);
    setErr('');
  }, [address]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  const run = useCallback(
    async (fresh: boolean) => {
      setBusy(true);
      setErr('');
      try {
        const r = await fetch('/api/base-links?address=' + address + (fresh ? '&fresh=1' : ''));
        const j = await r.json().catch(() => ({}));
        if (!r.ok) {
          setErr(j?.error || 'Link data is unavailable right now.');
          return;
        }
        setData(j as Data);
        setNow(Date.now());
      } catch {
        setErr('Connection problem. Try again.');
      } finally {
        setBusy(false);
      }
    },
    [address]
  );

  useEffect(() => {
    if (!data || !auto) return;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') void run(true);
    }, 180000);
    return () => clearInterval(id);
  }, [data, auto, run]);

  const pos = useMemo(() => (data ? layout(data.nodes, data.links) : new Map<string, P>()), [data]);
  const ci = new Map<string, number>();
  data?.clusters.forEach((c, i) => ci.set(c.id, i));
  const colorOf = (n: NodeT) =>
    n.kind === 'contract' ? CONTRACT : n.kind === 'locked' ? LOCKED : ci.has(n.cluster) ? PALETTE[(ci.get(n.cluster) as number) % PALETTE.length] : SOLO;
  const near = new Set<string>();
  if (sel && data) {
    for (const l of data.links) {
      if (l.a === sel) near.add(l.b);
      if (l.b === sel) near.add(l.a);
    }
  }
  const picked = data?.nodes.find((n) => n.address === sel) ?? null;
  const top = data?.clusters[0] ?? null;
  const ropes = data ? [...data.links].sort((x, y) => y.count - x.count).slice(0, 5) : [];
  const tone = !top ? 'text-emerald-300' : top.pct >= 30 ? 'text-rose-300' : top.pct >= 15 ? 'text-amber-300' : 'text-sky-300';

  return (
    <div className="mt-3 overflow-hidden rounded-2xl bg-[#0b1020] pb-4 text-slate-100">
      <div className="flex items-center justify-between px-4 pt-3">
        <p className="flex items-center gap-1.5 text-sm font-bold">
          <Link2 className="h-4 w-4 text-[#4d8dff]" /> Wallet links
        </p>
        {data && (
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span>Updated {ago(data.updatedAt, now)}</span>
            <button
              type="button"
              role="switch"
              aria-checked={auto}
              onClick={() => setAuto((v) => !v)}
              className={'rounded-full border px-2 py-0.5 font-semibold ' + (auto ? 'border-[#4d8dff] text-[#4d8dff]' : 'border-slate-600 text-slate-400')}
            >
              Auto {auto ? 'on' : 'off'}
            </button>
            <button type="button" onClick={() => void run(true)} disabled={busy} aria-label="Refresh" className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-600 active:scale-95 disabled:opacity-60">
              <RefreshCw className={'h-4 w-4 ' + (busy ? 'animate-spin' : '')} />
            </button>
          </div>
        )}
      </div>

      {!data && (
        <div className="px-4">
          <p className="mt-2 text-[13px] leading-5 text-slate-300">
            See if the biggest wallets of this token are connected. Wallets that send the token to each other may belong to one person who is hiding how much they own.
          </p>
          {busy ? (
            <div className="mt-3 flex h-40 items-center justify-center rounded-xl bg-white/5 text-xs text-slate-400">Reading transfers...</div>
          ) : (
            <button type="button" onClick={() => void run(false)} className="mt-3 w-full rounded-xl bg-[#0052ff] py-3 text-sm font-bold text-white active:scale-[0.98]">
              Find linked wallets
            </button>
          )}
          {err && <p className="mt-2 text-xs text-rose-300">{err}</p>}
        </div>
      )}

      {data && (
        <div>
          {err && <p className="px-4 pt-2 text-xs text-rose-300">{err}</p>}
          <div className="px-4 pt-2">
            <p className={'text-[14px] font-bold leading-5 ' + tone}>
              {data.note
                ? data.note
                : top
                ? 'Possible link: ' + top.size + ' wallets that sent this token to each other hold ' + top.pct.toFixed(1) + '% together.'
                : 'No ropes found. The top wallets did not send this token to each other recently.'}
            </p>
            <p className="mt-1 text-[12px] text-slate-400">The top holders shown own {data.totalPct.toFixed(1)}% of the supply.</p>
          </div>

          <svg viewBox={'0 0 ' + W + ' ' + H} className="mt-1 w-full touch-manipulation" role="img" aria-label="Wallet link map" onClick={() => setSel(null)}>
            {data.links.map((l) => {
              const p = pos.get(l.a);
              const q = pos.get(l.b);
              if (!p || !q) return null;
              const hot = !sel || l.a === sel || l.b === sel;
              const w = Math.min(4, 2 + l.count / 4);
              const d = ropePath(p, q);
              return (
                <g key={l.a + l.b} opacity={hot ? 1 : 0.15}>
                  <path d={d} fill="none" stroke="#6b4f27" strokeWidth={w + 2} strokeLinecap="round" />
                  <path d={d} fill="none" stroke="#e2bd78" strokeWidth={w} strokeDasharray="2.5 2.5" />
                </g>
              );
            })}
            {data.nodes.map((n) => {
              const p = pos.get(n.address);
              if (!p) return null;
              const c = colorOf(n);
              const dim = !!sel && n.address !== sel && !near.has(n.address);
              const label = n.pct >= 10 ? n.pct.toFixed(0) + '%' : n.pct.toFixed(1) + '%';
              const sub = n.kind === 'contract' ? n.tag ?? 'Contract' : n.kind === 'locked' ? 'Locked' : n.address.slice(2, 6);
              return (
                <g
                  key={n.address}
                  opacity={dim ? 0.3 : 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSel(sel === n.address ? null : n.address);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <circle cx={p.x} cy={p.y} r={p.r} fill={c} fillOpacity={0.4} stroke={c} strokeWidth={sel === n.address ? 4 : 2} strokeDasharray={n.kind === 'wallet' ? undefined : '5 3'} />
                  {p.r >= 16 && (
                    <text x={p.x} y={p.r >= 28 ? p.y - 4 : p.y} textAnchor="middle" dominantBaseline="middle" fontSize={p.r >= 28 ? 14 : 11} fontWeight={700} fill="#f8fafc">
                      {label}
                    </text>
                  )}
                  {p.r >= 28 && (
                    <text x={p.x} y={p.y + 12} textAnchor="middle" dominantBaseline="middle" fontSize={9} fill="#cbd5e1">
                      {sub.slice(0, 10)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full border-2 border-sky-400 bg-sky-400/40" />
              Bigger circle = bigger share
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1 w-5 rounded bg-[#e2bd78]" />
              Rope = sent tokens to each other
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full border-2 border-dashed border-slate-400" />
              Contract or locked
            </span>
          </div>

          {data.clusters.length > 0 && (
            <div className="mt-2 space-y-1 px-4 text-[12px]">
              {data.clusters.map((c, i) => (
                <p key={c.id} className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                  Group {i + 1}: {c.size} wallets · {c.pct.toFixed(1)}%
                </p>
              ))}
            </div>
          )}

          {picked && (
            <div className="mx-4 mt-3 rounded-xl bg-white/5 p-2 text-xs">
              <p className="break-all font-mono">{picked.address}</p>
              <p className="mt-1 text-slate-300">
                {picked.pct.toFixed(2)}% of supply · {picked.kind === 'wallet' ? (near.size > 0 ? 'linked to ' + near.size + ' wallet' + (near.size > 1 ? 's' : '') : 'no links found') : picked.kind === 'locked' ? 'locked' : 'contract'}
              </p>
              <a href={'https://basescan.org/address/' + picked.address} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[#4d8dff] underline">
                Basescan <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {ropes.length > 0 && (
            <div className="mt-3 space-y-1 px-4 text-[11px] text-slate-400">
              {ropes.map((l) => (
                <p key={l.a + l.b}>
                  {short(l.a)} ↔ {short(l.b)} · {l.count} transfer{l.count > 1 ? 's' : ''}
                  {/^0x[a-fA-F0-9]{64}$/.test(l.tx) && (
                    <a href={'https://basescan.org/tx/' + l.tx} target="_blank" rel="noopener noreferrer" className="ml-1 text-[#4d8dff] underline">
                      tx
                    </a>
                  )}
                </p>
              ))}
            </div>
          )}

          {!!data.failed && <p className="mt-2 px-4 text-[11px] text-amber-300">Some wallets could not be checked, so links may be missing.</p>}
          <p className="mt-3 px-4 text-[11px] leading-4 text-slate-500">
            Looks at the last 100 transfers of each top wallet. A link is a signal, not proof: the wallets may belong to one person, or to an exchange.
          </p>
        </div>
      )}
    </div>
  );
}
