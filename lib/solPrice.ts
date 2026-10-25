const SOL_MINT = 'So11111111111111111111111111111111111111112';
const FRESH_MS = 30_000;
const STALE_OK_MS = 15 * 60_000;
const MIN_OK = 5;
const MAX_OK = 5000;

let cache: { price: number; at: number } | null = null;

export async function getSolUsd(): Promise<number | null> {
  const now = Date.now();
  if (cache && now - cache.at < FRESH_MS) return cache.price;

  const key = process.env.JUPITER_API_KEY;
  if (key) {
    try {
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), 6000);
      const r = await fetch('https://api.jup.ag/price/v3?ids=' + SOL_MINT, {
        headers: { 'x-api-key': key },
        cache: 'no-store',
        signal: c.signal,
      }).finally(() => clearTimeout(t));
      if (r.ok) {
        const j: any = await r.json();
        const p = Number(j?.[SOL_MINT]?.usdPrice);
        if (Number.isFinite(p) && p > MIN_OK && p < MAX_OK) {
          cache = { price: p, at: now };
          return p;
        }
      }
    } catch {}
  }

  if (cache && now - cache.at < STALE_OK_MS) return cache.price;
  return null;
}
