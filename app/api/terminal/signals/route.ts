import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const BIRDEYE_BASE_URL = "https://public-api.birdeye.so";
const HELIUS_TX_URL = "https://api-mainnet.helius-rpc.com/v0/addresses";
const GECKO_BASE_URL = "https://api.geckoterminal.com/api/v2";

const WALLETS_TO_SCAN = 40;
const MIN_TRADE_COUNT = 3;
const BIRDEYE_CONCURRENCY = 3;
const HELIUS_CONCURRENCY = 8;
const REQUEST_TIMEOUT_MS = 10000;
const RECENT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes - live feed

const WSOL_MINT = "So11111111111111111111111111111111111111112";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
const QUOTE_MINTS = new Set([WSOL_MINT, USDC_MINT, USDT_MINT]);

interface TokenTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  tokenAmount: number;
  mint: string;
}
interface HeliusTx {
  type: string;
  timestamp: number;
  signature: string;
  tokenTransfers?: TokenTransfer[];
}
interface Wallet {
  address: string;
  pnl: number;
  tradeCount: number;
}
interface RawBuy {
  mint: string;
  tokenAmountReceived: number;
  timestamp: number;
  signature: string;
  smartWalletAddress: string;
}
interface Signal {
  id: string;
  tokenName: string;
  tokenSymbol: string;
  mint: string;
  poolAddress: string;
  smartWalletAddress: string;
  entryPriceUsd: number;
  currentPriceUsd: number;
  multiplier: number;
  timestamp: string;
  mcapUsd: number | null;
  buyAmountUsd: number;
  tokenImageUrl: string | null;
  walletTags: string[];
}

async function fetchJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  const MAX_RETRIES = 3;
  let attempt = 0;
  while (true) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, { headers, cache: "no-store", signal: controller.signal });
      if (response.status === 429 && attempt < MAX_RETRIES) {
        const retryAfter = Number(response.headers.get("retry-after"));
        const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1000 * (attempt + 1);
        attempt += 1;
        clearTimeout(timeout);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  worker: (item: T) => Promise<R>,
  concurrency: number
): Promise<(R | null)[]> {
  const results: (R | null)[] = new Array(items.length).fill(null);
  let nextIndex = 0;
  async function runWorker() {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      try {
        results[index] = await worker(items[index]);
      } catch {
        results[index] = null;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker()));
  return results;
}

let walletsCache: { data: Wallet[]; expiresAt: number } | null = null;
const WALLETS_CACHE_TTL_MS = 5 * 60 * 1000;

async function getVettedWallets(apiKey: string): Promise<Wallet[]> {
  if (walletsCache && walletsCache.expiresAt > Date.now()) {
    return walletsCache.data;
  }
  const url = new URL(`${BIRDEYE_BASE_URL}/trader/gainers-losers`);
  url.searchParams.set("type", "1W");
  url.searchParams.set("sort_by", "PnL");
  url.searchParams.set("sort_type", "desc");
  url.searchParams.set("offset", "0");
  url.searchParams.set("limit", "100");

  const json = await fetchJson<{ data?: { items?: any[] } }>(url.toString(), {
    Accept: "application/json",
    "X-API-KEY": apiKey,
    "x-chain": "solana",
  });

  const items = Array.isArray(json?.data?.items) ? json.data!.items! : [];

  const result = items
    .map((item) => ({
      address: String(item.address ?? ""),
      pnl: Number(item.pnl ?? item.PnL ?? item.totalPnl ?? 0),
      tradeCount: Number(item.tradeCount ?? item.trade_count ?? item.trade ?? 0),
    }))
    .filter((w) => w.address && w.pnl > 0 && w.tradeCount >= MIN_TRADE_COUNT)
    .sort((a, b) => b.pnl - a.pnl)
    .slice(0, WALLETS_TO_SCAN);

  walletsCache = { data: result, expiresAt: Date.now() + WALLETS_CACHE_TTL_MS };
  return result;
}

async function getRecentBuys(wallet: string, heliusKey: string): Promise<RawBuy[]> {
  const url = `${HELIUS_TX_URL}/${wallet}/transactions?api-key=${heliusKey}&type=SWAP&limit=10`;
  const txs = await fetchJson<HeliusTx[]>(url);

  const cutoff = Date.now() - RECENT_WINDOW_MS;
  const buys: RawBuy[] = [];

  for (const tx of txs) {
    if (tx.type !== "SWAP" || tx.timestamp * 1000 < cutoff) continue;
    const transfers = tx.tokenTransfers ?? [];

    const spentQuote = transfers.some((t) => t.fromUserAccount === wallet && QUOTE_MINTS.has(t.mint));
    if (!spentQuote) continue;

    const received: Record<string, number> = {};
    for (const t of transfers) {
      if (t.toUserAccount === wallet && !QUOTE_MINTS.has(t.mint)) {
        received[t.mint] = (received[t.mint] ?? 0) + t.tokenAmount;
      }
    }

    const boughtMint = Object.keys(received)[0];
    if (boughtMint) {
      buys.push({
        mint: boughtMint,
        tokenAmountReceived: received[boughtMint],
        timestamp: tx.timestamp,
        signature: tx.signature,
        smartWalletAddress: wallet,
      });
    }
  }
  return buys;
}

async function getTopPool(mint: string): Promise<string | null> {
  try {
    const json = await fetchJson<{ data?: any[] }>(
      `${GECKO_BASE_URL}/networks/solana/tokens/${mint}/pools`
    );
    const pools = json?.data ?? [];
    if (pools.length === 0) return null;
    pools.sort(
      (a, b) => Number(b.attributes?.reserve_in_usd ?? 0) - Number(a.attributes?.reserve_in_usd ?? 0)
    );
    return pools[0].attributes?.address ?? null;
  } catch {
    return null;
  }
}

async function getPoolTrades(pool: string): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  try {
    const json = await fetchJson<{ data?: any[] }>(
      `${GECKO_BASE_URL}/networks/solana/pools/${pool}/trades`
    );
    for (const t of json?.data ?? []) {
      const hash = t.attributes?.tx_hash;
      const vol = Number(t.attributes?.volume_in_usd ?? 0);
      if (hash) map.set(hash, vol);
    }
  } catch {
    // empty map on failure
  }
  return map;
}

const tokenInfoLiveCache = new Map<string, { data: any; expiresAt: number }>();
const TOKEN_INFO_CACHE_TTL_MS = 2 * 60 * 1000;

async function getTokenInfo(mint: string, apiKey: string): Promise<{
  name: string; symbol: string; price: number; logoURI: string | null; mc: number | null;
} | null> {
  const cached = tokenInfoLiveCache.get(mint);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  try {
    const json = await fetchJson<{ data?: any }>(
      `${BIRDEYE_BASE_URL}/defi/token_overview?address=${mint}`,
      { Accept: "application/json", "X-API-KEY": apiKey, "x-chain": "solana" }
    );
    const d = json?.data;
    if (!d) return null;
    const info = {
      name: d.name || "Unknown Token",
      symbol: d.symbol || "UNKNOWN",
      price: Number(d.price ?? 0),
      logoURI: d.logoURI || null,
      mc: d.mc ?? d.marketCap ?? null,
    };
    tokenInfoLiveCache.set(mint, { data: info, expiresAt: Date.now() + TOKEN_INFO_CACHE_TTL_MS });
    return info;
  } catch {
    return null;
  }
}

const REFRESH_INTERVAL_MS = 20 * 1000;

const CACHE_FILE = path.join(process.cwd(), ".signals-cache.json");
const LOCK_FILE = path.join(process.cwd(), ".signals-refresh.lock");

function readCacheFile(): { payload: any; computedAt: number } | null {
  try {
    const raw = fs.readFileSync(CACHE_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeCacheFile(payload: any) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ payload, computedAt: Date.now() }));
  } catch (error) {
    console.error("Failed to write signals cache file:", error);
  }
}

function isRefreshLocked(): boolean {
  try {
    const stat = fs.statSync(LOCK_FILE);
    // Consider lock stale after 60s (in case a previous refresh crashed)
    return Date.now() - stat.mtimeMs < 60_000;
  } catch {
    return false;
  }
}

function setRefreshLock() {
  try {
    fs.writeFileSync(LOCK_FILE, String(Date.now()));
  } catch {
    // ignore
  }
}

function clearRefreshLock() {
  try {
    fs.unlinkSync(LOCK_FILE);
  } catch {
    // ignore
  }
}

async function computeSignals(apiKey: string, heliusKey: string) {
  try {
    const wallets = await getVettedWallets(apiKey);

    const buysPerWallet = await mapWithConcurrency(
      wallets,
      (w) => getRecentBuys(w.address, heliusKey),
      HELIUS_CONCURRENCY
    );

    const allBuys: RawBuy[] = buysPerWallet.flat().filter((b): b is RawBuy => b !== null);

    const uniqueMints = Array.from(new Set(allBuys.map((b) => b.mint)));

    const pools = await mapWithConcurrency(uniqueMints, getTopPool, BIRDEYE_CONCURRENCY);
    const mintToPool = new Map<string, string>();
    uniqueMints.forEach((mint, i) => {
      const pool = pools[i];
      if (pool) mintToPool.set(mint, pool);
    });

    const uniquePools = Array.from(new Set(Array.from(mintToPool.values())));
    const tradesMaps = await mapWithConcurrency(uniquePools, getPoolTrades, BIRDEYE_CONCURRENCY);
    const poolToTrades = new Map<string, Map<string, number>>();
    uniquePools.forEach((pool, i) => {
      poolToTrades.set(pool, tradesMaps[i] ?? new Map());
    });

    const tokenInfoResults = await mapWithConcurrency(
      uniqueMints,
      (mint) => getTokenInfo(mint, apiKey),
      BIRDEYE_CONCURRENCY
    );
    const tokenInfoMap = new Map<string, Awaited<ReturnType<typeof getTokenInfo>>>();
    uniqueMints.forEach((mint, i) => tokenInfoMap.set(mint, tokenInfoResults[i]));

    const signals: Signal[] = [];

    for (const buy of allBuys) {
      const pool = mintToPool.get(buy.mint);
      if (!pool) continue;
      const trades = poolToTrades.get(pool);
      const buyAmountUsd = trades?.get(buy.signature);
      if (!buyAmountUsd || buyAmountUsd <= 0) continue;

      const info = tokenInfoMap.get(buy.mint);
      if (!info) continue;

      const entryPriceUsd = buy.tokenAmountReceived > 0 ? buyAmountUsd / buy.tokenAmountReceived : 0;
      const currentPriceUsd = info.price;
      const multiplier = entryPriceUsd > 0 ? currentPriceUsd / entryPriceUsd : 1;

      signals.push({
        id: `${buy.mint}:${buy.smartWalletAddress}:${buy.timestamp}`,
        tokenName: info.name,
        tokenSymbol: info.symbol,
        mint: buy.mint,
        poolAddress: pool,
        smartWalletAddress: buy.smartWalletAddress,
        entryPriceUsd,
        currentPriceUsd,
        multiplier,
        timestamp: new Date(buy.timestamp * 1000).toISOString(),
        mcapUsd: info.mc,
        buyAmountUsd,
        tokenImageUrl: info.logoURI,
        walletTags: ["smart_trader"],
      });
    }

    const finalSignals = signals
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20);

    const payload = {
      success: true,
      signals: finalSignals,
      meta: {
        source: "helius+gecko+birdeye",
        chain: "solana",
        walletsScanned: wallets.length,
        rawBuysFound: allBuys.length,
        signalsReturned: finalSignals.length,
      },
    };

    writeCacheFile(payload);
    return payload;
  } catch (error) {
    console.error("Terminal signals computation error:", error);
    throw error;
  }
}

function refreshInBackground(apiKey: string, heliusKey: string) {
  if (isRefreshLocked()) return;
  setRefreshLock();
  computeSignals(apiKey, heliusKey)
    .catch((error) => {
      console.error("Background signals refresh failed:", error);
    })
    .finally(() => {
      clearRefreshLock();
    });
}

export async function GET() {
  const apiKey = process.env.BIRDEYE_API_KEY;
  const heliusKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;

  if (!apiKey || !heliusKey) {
    return NextResponse.json({ error: "Birdeye or Helius API key is not configured." }, { status: 503 });
  }

  const now = Date.now();
  const cached = readCacheFile();

  if (cached) {
    const age = now - cached.computedAt;

    if (age > REFRESH_INTERVAL_MS) {
      refreshInBackground(apiKey, heliusKey);
    }

    return NextResponse.json(
      { ...cached.payload, meta: { ...cached.payload.meta, cacheAgeMs: age } },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const payload = await computeSignals(apiKey, heliusKey);
    return NextResponse.json(payload, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: "Unable to load smart-money signals.", diagnostic: error instanceof Error ? error.message : "Unknown" },
      { status: 502 }
    );
  }
}
