'use client';

import { useState } from 'react';
import { ExternalLink, Link2 } from 'lucide-react';

type NodeT = { address: string; pct: number; cluster: string };
type LinkT = { a: string; b: string; count: number; tx: string };
type Cluster = { id: string; size: number; pct: number };
type Data = { address: string; nodes: NodeT[]; links: LinkT[]; clusters: Cluster[]; failed?: number; note?: string };

const PALETTE = ['59,130,246', '249,115,22', '168,85,247', '236,72,153', '20,184,166', '234,179,8'];
const GRAY = '156,163,175';
const W = 360;
const H = 320;
const short = (a: string) => a.slice(0, 6) + '…' + a.slice(-4);

export default function LinksMap({ address }: { address: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [data, setData] = useState<Data | null>(null);
  const [sel, setSel] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setErr('');
    setData(null);
    setSel(null);
    try {
      const r = await fetch('/api/base-links?address=' + address);
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(j?.error || 'Link data is unavailable right now.');
        return;
      }
      setData(j as Data);
    } catch {
      setErr('Connection problem. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const colorIdx = new Map<string, number>();
  data?.clusters.forEach((c, i) => colorIdx.set(c.id, i));
  const order = data
    ? [...data.nodes].sort((x, y) => (colorIdx.get(x.cluster) ?? 99) - (colorIdx.get(y.cluster) ?? 99) || y.pct - x.pct)
    : [];
  const pos = new Map<string, { x: number; y: number; r: number; rgb: string }>();
  order.forEach((nd, i) => {
    const ang = (i / order.length) * Math.PI * 2 - Math.PI / 2;
    const ci = colorIdx.get(nd.cluster);
    pos.set(nd.address, {
      x: W / 2 + 112 * Math.cos(ang),
      y: H / 2 + 112 * Math.sin(ang),
      r: Math.min(24, 8 + Math.sqrt(nd.pct) * 3),
      rgb: ci === undefined ? GRAY : PALETTE[ci % PALETTE.length],
    });
  });
  const picked = order.find((n) => n.address === sel) ?? null;
  const top = data?.clusters[0] ?? null;
  const links = data ? [...data.links].sort((x, y) => y.count - x.count).slice(0, 5) : [];

  return (
    <div className="mt-3 border-t border-bbl-border pt-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1 text-sm font-bold">
          <Link2 className="h-4 w-4" /> Wallet links
        </p>
        <button onClick={() => void run()} disabled={busy} className="rounded-full border border-bbl-border px-3 py-1 text-xs font-semibold active:scale-95 disabled:opacity-50">
          {busy ? 'Searching...' : data ? 'Refresh' : 'Find links'}
        </button>
      </div>
      {err && <p className="mt-2 text-xs text-rose-600">{err}</p>}
      {busy && <div className="mt-2 h-24 animate-pulse rounded-xl bg-bbl-text/[0.04]" />}

      {data && !busy && (
        <div className="mt-2">
          <p className={'text-[13px] font-semibold ' + (top ? 'text-rose-700' : 'text-bbl-text')}>
            {data.note
              ? data.note
              : top
              ? 'Possible link: ' + top.size + ' wallets that sent this token to each other hold ' + top.pct.toFixed(1) + '% together.'
              : 'No direct transfers found between the top holders.'}
          </p>

          {order.length > 1 && (
            <svg viewBox={'0 0 ' + W + ' ' + H} className="mt-2 w-full" role="img">
              {data.links.map((l) => {
                const p = pos.get(l.a);
                const q = pos.get(l.b);
                if (!p || !q) return null;
                return <line key={l.a + l.b} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="rgba(120,120,120,0.55)" strokeWidth={Math.min(4, 1 + l.count / 3)} />;
              })}
              {order.map((nd) => {
                const p = pos.get(nd.address);
                if (!p) return null;
                return (
                  <g key={nd.address} onClick={() => setSel(nd.address)} style={{ cursor: 'pointer' }}>
                    <circle cx={p.x} cy={p.y} r={p.r} fill={'rgba(' + p.rgb + ',0.4)'} stroke={'rgb(' + p.rgb + ')'} strokeWidth={sel === nd.address ? 3.5 : 1.5} />
                    {p.r >= 14 && (
                      <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontSize={10} fontWeight={700} fill="#1c1917">
                        {nd.pct.toFixed(0) + '%'}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          )}

          {picked && (
            <div className="mt-1 rounded-xl bg-bbl-text/[0.04] p-2 text-xs">
              <p className="break-all font-mono">{picked.address}</p>
              <p className="mt-1">
                {picked.pct.toFixed(2)}% of supply{colorIdx.has(picked.cluster) ? ' · in a linked group' : ' · no links found'}
              </p>
              <a href={'https://basescan.org/address/' + picked.address} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 underline">
                Basescan <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {links.length > 0 && (
            <div className="mt-2 space-y-1 text-[11px] text-bbl-muted">
              {links.map((l) => (
                <p key={l.a + l.b}>
                  {short(l.a)} ↔ {short(l.b)} · {l.count} transfer{l.count > 1 ? 's' : ''}
                  {/^0x[a-fA-F0-9]{64}$/.test(l.tx) && (
                    <a href={'https://basescan.org/tx/' + l.tx} target="_blank" rel="noopener noreferrer" className="ml-1 underline">
                      tx
                    </a>
                  )}
                </p>
              ))}
            </div>
          )}

          {!!data.failed && <p className="mt-2 text-[11px] text-amber-700">Some wallets could not be checked, so links may be missing.</p>}
          <p className="mt-2 text-[11px] leading-4 text-bbl-muted">
            Looks at the last 100 transfers of each top wallet. A link is a signal, not proof: wallets may belong to one person, or to an exchange.
          </p>
        </div>
      )}
    </div>
  );
}
