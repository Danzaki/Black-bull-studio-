'use client';

import { useEffect, useState } from 'react';
import { authedFetch } from '@/lib/authedFetch';

const CASHTAG_RE = /(?:^|[\s(])\$([A-Za-z][A-Za-z0-9]{1,9})\b/;
const cache = new Map<string, Promise<string | null>>();
let active = 0;
const waiting: Array<() => void> = [];

async function slot() {
  if (active >= 2) await new Promise<void>((r) => waiting.push(r));
  active++;
}
function release() {
  active--;
  waiting.shift()?.();
}

function resolveSymbol(symbol: string): Promise<string | null> {
  const key = symbol.toUpperCase();
  let p = cache.get(key);
  if (!p) {
    p = (async () => {
      await slot();
      try {
        const r = await authedFetch('/api/token/search?q=' + encodeURIComponent(key));
        if (!r.ok) { cache.delete(key); return null; }
        const j = await r.json();
        const items: any[] = Array.isArray(j?.items) ? j.items : [];
        const best = items
          .filter((t) => t.verified === true && t.mint && String(t.symbol).toUpperCase() === key)
          .sort((a, b) => (b.liquidity ?? 0) - (a.liquidity ?? 0))[0];
        return best ? (best.mint as string) : null;
      } catch {
        cache.delete(key);
        return null;
      } finally {
        release();
      }
    })();
    cache.set(key, p);
    if (cache.size > 200) cache.delete(cache.keys().next().value as string);
  }
  return p;
}

export function useCashtagMint(content: string | null | undefined, skip: boolean) {
  const [mint, setMint] = useState<string | null>(null);
  useEffect(() => {
    const m = !skip && content ? content.match(CASHTAG_RE) : null;
    if (!m) { setMint(null); return; }
    let alive = true;
    resolveSymbol(m[1]).then((v) => { if (alive) setMint(v); });
    return () => { alive = false; };
  }, [content, skip]);
  return mint;
}
