import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

const EVM_RE = /^0x[a-fA-F0-9]{40}$/;

const STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  safe: { bg: '#052e1c', fg: '#34d399', label: 'No major red flags found' },
  caution: { bg: '#3a2a05', fg: '#fbbf24', label: 'Some risks found' },
  warning: { bg: '#3a1c05', fg: '#fb923c', label: 'Risky' },
  danger: { bg: '#3b0a14', fg: '#fb7185', label: 'Dangerous. Do not buy.' },
  unknown: { bg: '#1f2937', fg: '#9ca3af', label: 'No security data' },
};

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

export async function GET(req: NextRequest) {
  const { origin, searchParams } = new URL(req.url);
  const address = (searchParams.get('address') ?? '').trim();

  let symbol = 'Base token';
  let name = '';
  let level = 'unknown';
  let risks: string[] = [];
  let liq = '--';
  let sell = '--';

  if (EVM_RE.test(address)) {
    const [tok, sec] = await Promise.all([
      getJson(origin + '/api/chain/token?chain=base&address=' + address),
      getJson(origin + '/api/chain/security?chain=base&address=' + address),
    ]);
    if (tok?.symbol) {
      symbol = String(tok.symbol).slice(0, 14);
      name = String(tok.name ?? '').slice(0, 30);
      liq = usd(tok.liquidity);
    }
    if (sec?.level && STYLE[sec.level]) {
      level = sec.level;
      risks = Array.isArray(sec.risks) ? sec.risks.slice(0, 3).map((r: unknown) => String(r).slice(0, 48)) : [];
      const st = Number(sec.sellTax);
      if (Number.isFinite(st)) sell = st.toFixed(1) + '%';
    }
  }

  const c = STYLE[level] ?? STYLE.unknown;
  const lines = risks.length > 0 ? risks : level === 'safe' ? ['Checked honeypot, taxes, mint and owner powers'] : [];
  const sub = name + (address ? '  ' + address.slice(0, 6) + '...' + address.slice(-4) : '');
  const stats = 'Liquidity ' + liq + '   Sell tax ' + sell;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#0b0b0c', color: '#ffffff', padding: 56 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, color: '#f97316' }}>BLACK BULL | BASE SAFETY</div>
          <div style={{ display: 'flex', fontSize: 26, color: '#93c5fd', border: '2px solid #3b82f6', borderRadius: 999, padding: '6px 20px' }}>Base</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', width: 110, height: 110, borderRadius: 999, background: '#f97316', alignItems: 'center', justifyContent: 'center', fontSize: 60, fontWeight: 700 }}>{symbol.slice(0, 1).toUpperCase()}</div>
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 28 }}>
            <div style={{ display: 'flex', fontSize: 76, fontWeight: 700 }}>{symbol}</div>
            <div style={{ display: 'flex', fontSize: 30, color: '#a3a3a3' }}>{sub}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', background: c.bg, border: '4px solid ' + c.fg, borderRadius: 28, padding: 32 }}>
          <div style={{ display: 'flex', fontSize: 54, fontWeight: 700, color: c.fg }}>{c.label}</div>
          {lines.map((t) => (
            <div key={t} style={{ display: 'flex', fontSize: 30, color: '#e5e5e5', marginTop: 10 }}>{'- ' + t}</div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 26, color: '#a3a3a3' }}>
          <div style={{ display: 'flex' }}>{stats}</div>
          <div style={{ display: 'flex' }}>Automated check. Not financial advice.</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    }
  );
}
