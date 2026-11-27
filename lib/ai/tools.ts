import { Schema } from 'firebase/ai';
import { USER_TOOLS, TOOL_HINTS as USER_HINTS } from './userTools';

export type AICard =
  | {
      kind: 'market';
      data: {
        mint: string; symbol: string; name: string; priceUsd: number | null; liquidityUsd: number | null;
        marketCap: number | null; change24h: number | null; volume24h: number | null; dex: string; url: string | null;
      };
    }
  | {
      kind: 'risk';
      data: {
        mint: string; level: 'low' | 'medium' | 'high'; score: number | null; flags: string[];
        mintRevoked: boolean | null; freezeRevoked: boolean | null; holders: number | null; top10Pct: number | null;
      };
    };

export type ToolStep = { id: string; name: string; label: string; status: 'running' | 'done' | 'error' };

type ToolResult = { data: Record<string, unknown>; card?: AICard };
export type Tool = {
  name: string;
  label: (a: any) => string;
  description: string;
  parameters: any;
  run: (a: any, signal?: AbortSignal) => Promise<ToolResult>;
};

const SOL = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
// Token names/symbols are attacker-controlled: strip control chars and cap length.
const clean = (s: unknown, n = 80) => (typeof s === 'string' ? s.replace(/[\u0000-\u001f]/g, ' ').slice(0, n) : '');
const num = (v: unknown) => {
  const n = Number(v);
  return v !== null && v !== undefined && v !== '' && Number.isFinite(n) ? n : null;
};

async function getJson(url: string, signal?: AbortSignal) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 9000);
  const onAbort = () => c.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    const r = await fetch(url, { signal: c.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally {
    clearTimeout(t);
    signal?.removeEventListener('abort', onAbort);
  }
}

const mintParam = Schema.object({
  properties: { mint: Schema.string({ description: 'Solana token mint address (base58)' }) },
});

const BASE_TOOLS: Tool[] = [
  {
    name: 'search_token',
    label: (a) => 'Searching tokens for "' + clean(a?.query, 24) + '"',
    description: 'Find Solana tokens by name or symbol. Returns up to 5 matches (mint, symbol, name, liquidity), best liquidity first.',
    parameters: Schema.object({ properties: { query: Schema.string({ description: 'Token name or symbol, e.g. BONK' }) } }),
    run: async (a, signal) => {
      const q = clean(a?.query, 40).trim();
      if (q.length < 2) throw new Error('query too short');
      const j = await getJson('https://api.dexscreener.com/latest/dex/search?q=' + encodeURIComponent(q), signal);
      const seen = new Set<string>();
      const all: any[] = [];
      for (const p of j?.pairs ?? []) {
        const mint = p?.baseToken?.address;
        if (p?.chainId !== 'solana' || typeof mint !== 'string' || !SOL.test(mint) || seen.has(mint)) continue;
        seen.add(mint);
        all.push({
          mint, symbol: clean(p.baseToken.symbol, 20), name: clean(p.baseToken.name, 50),
          priceUsd: num(p.priceUsd), liquidityUsd: num(p.liquidity?.usd),
        });
      }
      all.sort((x, y) => (y.liquidityUsd ?? 0) - (x.liquidityUsd ?? 0));
      return { data: { results: all.slice(0, 5), note: all.length ? undefined : 'No Solana token found' } };
    },
  },
  {
    name: 'get_token_market',
    label: () => 'Fetching market data',
    description: 'Live market data for a Solana token: price, liquidity, market cap, 24h volume, price changes, buys/sells, pair age.',
    parameters: mintParam,
    run: async (a, signal) => {
      const mint = String(a?.mint ?? '');
      if (!SOL.test(mint)) throw new Error('invalid mint');
      const j = await getJson('https://api.dexscreener.com/latest/dex/tokens/' + mint, signal);
      const pairs = (j?.pairs ?? []).filter((p: any) => p?.chainId === 'solana' && p?.baseToken?.address === mint);
      if (!pairs.length) throw new Error('No trading pair found for this mint');
      pairs.sort((x: any, y: any) => (num(y.liquidity?.usd) ?? 0) - (num(x.liquidity?.usd) ?? 0));
      const p = pairs[0];
      const data = {
        mint, symbol: clean(p.baseToken.symbol, 20), name: clean(p.baseToken.name, 50),
        priceUsd: num(p.priceUsd), liquidityUsd: num(p.liquidity?.usd), marketCap: num(p.marketCap ?? p.fdv),
        volume24h: num(p.volume?.h24),
        priceChangePct: { m5: num(p.priceChange?.m5), h1: num(p.priceChange?.h1), h6: num(p.priceChange?.h6), h24: num(p.priceChange?.h24) },
        txns24h: { buys: num(p.txns?.h24?.buys), sells: num(p.txns?.h24?.sells) },
        pairAgeHours: typeof p.pairCreatedAt === 'number' ? Math.round((Date.now() - p.pairCreatedAt) / 3.6e6) : null,
        dex: clean(p.dexId, 30), pairCount: pairs.length,
        url: typeof p.url === 'string' && p.url.startsWith('https://') ? p.url : null,
      };
      return {
        data,
        card: {
          kind: 'market',
          data: {
            mint, symbol: data.symbol, name: data.name, priceUsd: data.priceUsd, liquidityUsd: data.liquidityUsd,
            marketCap: data.marketCap, change24h: data.priceChangePct.h24, volume24h: data.volume24h, dex: data.dex, url: data.url,
          },
        },
      };
    },
  },
  {
    name: 'check_token_security',
    label: () => 'Running security check',
    description:
      'Security report for a Solana token from RugCheck: risk flags, mint/freeze authority, holder count and top-holder concentration.',
    parameters: mintParam,
    run: async (a, signal) => {
      const mint = String(a?.mint ?? '');
      if (!SOL.test(mint)) throw new Error('invalid mint');
      const j = await getJson('https://api.rugcheck.xyz/v1/tokens/' + mint + '/report', signal);
      const risks: any[] = Array.isArray(j?.risks) ? j.risks : [];
      const flags = risks.slice(0, 8).map((r) => ({
        name: clean(r?.name, 60), level: clean(r?.level, 10), detail: clean(r?.description, 140),
      }));
      const mintRevoked: boolean | null = j?.mintAuthority === null ? true : typeof j?.mintAuthority === 'string' ? false : null;
      const freezeRevoked: boolean | null = j?.freezeAuthority === null ? true : typeof j?.freezeAuthority === 'string' ? false : null;
      const holders: any[] = Array.isArray(j?.topHolders) ? j.topHolders : [];
      const top10Pct = holders.length ? Math.round(holders.slice(0, 10).reduce((s, h) => s + (num(h?.pct) ?? 0), 0) * 10) / 10 : null;
      const hasDanger = risks.some((r) => r?.level === 'danger');
      const hasWarn = risks.some((r) => r?.level === 'warn');
      const level: 'low' | 'medium' | 'high' =
        j?.rugged || hasDanger ? 'high' : hasWarn || mintRevoked === false || freezeRevoked === false ? 'medium' : 'low';
      const data = {
        mint, rugged: !!j?.rugged, riskLevel: level,
        riskScoreNormalised: num(j?.score_normalised), riskFlags: flags, mintAuthorityRevoked: mintRevoked,
        freezeAuthorityRevoked: freezeRevoked, totalHolders: num(j?.totalHolders), top10HoldersPct: top10Pct,
        totalLiquidityUsd: num(j?.totalMarketLiquidity),
        notes: 'riskLevel is derived from RugCheck flags. Top holders may include liquidity pool accounts.',
      };
      return {
        data,
        card: {
          kind: 'risk',
          data: {
            mint, level, score: data.riskScoreNormalised, flags: flags.map((f) => f.name).filter(Boolean).slice(0, 4),
            mintRevoked, freezeRevoked, holders: data.totalHolders, top10Pct,
          },
        },
      };
    },
  },
];

export const toolDeclarations = () => [
  { functionDeclarations: TOOLS.map((t) => ({ name: t.name, description: t.description, parameters: t.parameters })) },
];

export const TOOLS: Tool[] = [...BASE_TOOLS, ...USER_TOOLS];
export const TOOL_HINTS = USER_HINTS;
