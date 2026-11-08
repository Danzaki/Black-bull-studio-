import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { plainRisk, headline, subline } from '@/lib/baseRisk';

export const runtime = 'edge';

const EVM_RE = /^0x[a-fA-F0-9]{40}$/;

const LEVEL: Record<string, { color: string; glow: string; mark: string }> = {
  safe: { color: '#34d399', glow: 'rgba(52,211,153,0.28)', mark: 'OK' },
  caution: { color: '#fbbf24', glow: 'rgba(251,191,36,0.26)', mark: '!' },
  warning: { color: '#fb923c', glow: 'rgba(251,146,60,0.28)', mark: '!' },
  danger: { color: '#f43f5e', glow: 'rgba(244,63,94,0.32)', mark: '!' },
  unknown: { color: '#94a3b8', glow: 'rgba(148,163,184,0.2)', mark: '?' },
};

type Hold = { pct: number; kind: string };
type Ball = { x: number; y: number; r: number; kind: string; label: string };

async function getJson(url: string) {
  try {
    const r = await fetch(url, { cache: 'no-store' });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

function usd(v: unknown) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return '--';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + n.toFixed(0);
}

function pack(items: Hold[], w: number, h: number): Ball[] {
  if (items.length === 0) return [];
  const sum = items.reduce((s, i) => s + i.pct, 0);
  const max = Math.max(...items.map((i) => i.pct));
  const k = Math.min(78 / Math.sqrt(max), Math.sqrt((0.36 * w * h) / (Math.PI * sum)));
  const out: Ball[] = [];
  for (const it of items) {
    const r = Math.max(14, k * Math.sqrt(it.pct));
    for (let t = 0; t < 2500; t++) {
      const a = t * 0.35;
      const d = t * 0.22;
      const x = w / 2 + d * Math.cos(a);
      const y = h / 2 + d * Math.sin(a) * 0.9;
      if (x - r < 2 || x + r > w - 2 || y - r < 2 || y + r > h - 2) continue;
      if (out.some((o) => Math.hypot(o.x - x, o.y - y) < o.r + r + 4)) continue;
      out.push({ x, y, r, kind: it.kind, label: it.pct.toFixed(it.pct >= 10 ? 0 : 1) + '%' });
      break;
    }
  }
  return out;
}

export async function GET(req: NextRequest) {
  const { origin, searchParams } = new URL(req.url);
  const address = (searchParams.get('address') ?? '').trim();

  let symbol = 'Token';
  let name = '';
  let level = 'unknown';
  let risks: string[] = [];
  let liq = '--';
  let sell = '--';
  let holds: Hold[] = [];

  if (EVM_RE.test(address)) {
    const [tok, sec] = await Promise.all([
      getJson(origin + '/api/chain/token?chain=base&address=' + address),
      getJson(origin + '/api/chain/security?chain=base&address=' + address),
    ]);
    if (tok?.symbol) {
      symbol = String(tok.symbol).slice(0, 12);
      name = String(tok.name ?? '').slice(0, 24);
      liq = usd(tok.liquidity);
    }
    if (sec?.level && LEVEL[sec.level]) {
      level = sec.level;
      risks = Array.isArray(sec.risks) ? sec.risks.map((r: unknown) => plainRisk(String(r))).slice(0, 3) : [];
      const st = Number(sec.sellTax);
      if (Number.isFinite(st)) sell = st.toFixed(1) + '%';
      holds = (Array.isArray(sec.holders) ? sec.holders : [])
        .filter((h: any) => Number(h?.pct) > 0)
        .slice(0, 8)
        .map((h: any) => ({ pct: Number(h.pct), kind: h.isLocked ? 'locked' : h.isContract ? 'contract' : 'wallet' }));
    }
  }

  const c = LEVEL[level] ?? LEVEL.unknown;
  const reasons = risks.length > 0 ? risks : level === 'safe' ? ['Honeypot, tax, mint and owner checks passed'] : level === 'unknown' ? ['Our security provider has no data on this token'] : [];
  const balls = pack([...holds].sort((a, b) => b.pct - a.pct), 380, 300);
  const topPct = holds.reduce((s, h) => s + h.pct, 0);
  const short = address ? address.slice(0, 6) + '...' + address.slice(-4) : '';
  const stats: string[][] = [['Liquidity', liq], ['Sell tax', sell]];
  if (topPct > 0) stats.push(['Top holders', topPct.toFixed(0) + '%']);

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#060a14', backgroundImage: 'radial-gradient(circle at 88% 4%, ' + c.glow + ', rgba(6,10,20,0) 55%)', color: '#eaf0ff', padding: '40px 56px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', width: 38, height: 38, borderRadius: 10, background: '#0052ff' }} />
            <div style={{ display: 'flex', marginLeft: 14, fontSize: 30, fontWeight: 700 }}>Base Safety</div>
          </div>
          <div style={{ display: 'flex', fontSize: 24, color: '#8a97b5' }}>black-bull-studio.vercel.app/base</div>
        </div>

        <div style={{ display: 'flex', flex: 1, marginTop: 22 }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', width: 88, height: 88, borderRadius: 9999, background: '#0052ff', alignItems: 'center', justifyContent: 'center', fontSize: 46, fontWeight: 700 }}>{symbol.slice(0, 1).toUpperCase()}</div>
              <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 22 }}>
                <div style={{ display: 'flex', fontSize: 70, fontWeight: 700, lineHeight: 1 }}>{symbol}</div>
                <div style={{ display: 'flex', fontSize: 24, color: '#8a97b5', marginTop: 6 }}>{(name ? name + ' - ' : '') + short}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', marginTop: 28 }}>
              <div style={{ display: 'flex', width: 84, height: 84, borderRadius: 9999, border: '6px solid ' + c.color, alignItems: 'center', justifyContent: 'center', fontSize: 38, fontWeight: 700, color: c.color }}>{c.mark}</div>
              <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 24 }}>
                <div style={{ display: 'flex', fontSize: 58, fontWeight: 700, color: c.color, lineHeight: 1 }}>{headline(level)}</div>
                <div style={{ display: 'flex', fontSize: 26, color: '#c7d2ee', marginTop: 10, maxWidth: 640 }}>{subline(level)}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 20 }}>
              {reasons.map((t) => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
                  <div style={{ display: 'flex', width: 14, height: 14, borderRadius: 9999, background: c.color, marginRight: 16 }} />
                  <div style={{ display: 'flex', fontSize: 28 }}>{t}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', width: 380, marginLeft: 36 }}>
            <div style={{ display: 'flex', fontSize: 24, color: '#8a97b5' }}>Top holders</div>
            <div style={{ display: 'flex', position: 'relative', width: 380, height: 300, marginTop: 8 }}>
              {balls.length === 0 && <div style={{ display: 'flex', fontSize: 24, color: '#8a97b5' }}>No holder data</div>}
              {balls.map((b, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: b.x - b.r,
                    top: b.y - b.r,
                    width: b.r * 2,
                    height: b.r * 2,
                    borderRadius: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: b.kind === 'wallet' ? 'rgba(59,130,246,0.45)' : b.kind === 'locked' ? 'rgba(52,211,153,0.35)' : 'rgba(100,116,139,0.4)',
                    border: '3px solid ' + (b.kind === 'wallet' ? '#60a5fa' : b.kind === 'locked' ? '#34d399' : '#94a3b8'),
                    fontSize: Math.min(24, b.r * 0.55),
                    fontWeight: 700,
                  }}
                >
                  {b.r >= 22 ? b.label : ''}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', fontSize: 20, color: '#8a97b5', marginTop: 6 }}>Circle size = share of supply</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, paddingTop: 16, borderTop: '2px solid #1a2440' }}>
          <div style={{ display: 'flex' }}>
            {stats.map(([k, v]) => (
              <div key={k} style={{ display: 'flex', marginRight: 34, fontSize: 26 }}>
                <div style={{ display: 'flex', color: '#8a97b5' }}>{k}</div>
                <div style={{ display: 'flex', marginLeft: 10, fontWeight: 700 }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', fontSize: 20, color: '#8a97b5' }}>Automated check. Not financial advice.</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } }
  );
}
