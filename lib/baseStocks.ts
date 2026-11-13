export type Stock = {
  address: string;
  symbol: string;
  name: string;
  iconUrl: string | null;
  isin: string | null;
  multiplier: number | null;
  paused: boolean;
  navPrice: number | null;
  navAgeMin: number | null;
  pool: string | null;
  dexPrice: number | null;
  premiumPct: number | null;
  liquidity: number;
  volume24h: number;
  totalSupply: number | null;
  firstMint: string | null;
};

export type StocksData = { updatedAt: number; count: number; stocks: Stock[] };

export type NavTone = 'ok' | 'old' | 'stale' | 'paused' | 'none';

export function navState(s: Stock): { label: string; tone: NavTone } {
  if (s.paused) return { label: 'Paused', tone: 'paused' };
  if (s.navAgeMin === null || s.navPrice === null) return { label: 'No price', tone: 'none' };
  if (s.navAgeMin <= 120) return { label: 'Fresh', tone: 'ok' };
  if (s.navAgeMin <= 26 * 60) return { label: 'Market may be closed', tone: 'old' };
  return { label: 'Old price', tone: 'stale' };
}

export function ageText(min: number | null) {
  if (min === null) return '--';
  if (min < 1) return 'just now';
  if (min < 60) return min + 'm ago';
  if (min < 1440) return Math.floor(min / 60) + 'h ago';
  return Math.floor(min / 1440) + 'd ago';
}

export function fmtPrice(v: number | null | undefined) {
  if (v === null || v === undefined || !(v > 0)) return '--';
  return '$' + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: v >= 100 ? 2 : 4 });
}

export function fmtUsd(v: number | null | undefined) {
  if (!v) return '--';
  if (v >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
  if (v >= 1e3) return '$' + (v / 1e3).toFixed(1) + 'K';
  return '$' + v.toFixed(0);
}

export function matchStock(stocks: Stock[] | null, address: string, symbol: string | undefined) {
  if (!stocks || stocks.length === 0) return { official: null as Stock | null, impostor: null as Stock | null };
  const a = address.toLowerCase();
  const official = stocks.find((s) => s.address === a) ?? null;
  if (official) return { official, impostor: null as Stock | null };
  const sym = (symbol ?? '').trim().toLowerCase();
  const impostor = sym ? stocks.find((s) => s.symbol.toLowerCase() === sym || s.symbol.toLowerCase().replace(/c$/, '') === sym) ?? null : null;
  return { official: null as Stock | null, impostor };
}
