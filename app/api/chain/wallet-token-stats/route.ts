import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, erc20Abi, formatUnits, http, isAddress } from "viem";
import { getChain } from "@/lib/chains";

export const dynamic = "force-dynamic";

const ALCHEMY_NET: Record<string, string> = { bsc: "bnb-mainnet", base: "base-mainnet" };
const WEEK = 7 * 24 * 60 * 60;
const GECKO = "https://api.geckoterminal.com/api/v2";

type Tr = { id: string; hash: string; amount: number; ts: number; type: "buy" | "sell" };
type Pt = { t: number; c: number };

async function fetchTransfers(url: string, token: string, wallet: string, dir: "in" | "out") {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "alchemy_getAssetTransfers",
      params: [
        {
          fromBlock: "0x0",
          toBlock: "latest",
          category: ["erc20"],
          contractAddresses: [token],
          withMetadata: true,
          excludeZeroValue: true,
          order: "desc",
          maxCount: "0x1f4",
          ...(dir === "in" ? { toAddress: wallet } : { fromAddress: wallet }),
        },
      ],
    }),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message || "transfer lookup failed");
  const list: Tr[] = (j.result?.transfers ?? []).map((t: any) => ({
    id: t.uniqueId,
    hash: t.hash,
    amount: Number(t.value ?? 0),
    ts: Math.floor(new Date(t.metadata?.blockTimestamp).getTime() / 1000),
    type: dir === "in" ? "buy" : "sell",
  }));
  return { list, more: Boolean(j.result?.pageKey) };
}

async function fetchCandles(network: string, pool: string, unit: "hour" | "day"): Promise<Pt[]> {
  try {
    const r = await fetch(
      `${GECKO}/networks/${network}/pools/${pool}/ohlcv/${unit}?aggregate=1&limit=1000`,
      { headers: { Accept: "application/json" }, cache: "no-store" }
    );
    if (!r.ok) return [];
    const list: number[][] = (await r.json()).data?.attributes?.ohlcv_list ?? [];
    return list.map((x) => ({ t: x[0], c: x[4] })).sort((a, b) => a.t - b.t);
  } catch {
    return [];
  }
}

function priceAt(hourly: Pt[], daily: Pt[], ts: number): number {
  const arr = hourly.length && ts >= hourly[0].t ? hourly : daily;
  if (!arr.length) return 0;
  let best = arr[0];
  for (const p of arr) {
    if (p.t <= ts) best = p;
    else break;
  }
  return best.c;
}

export async function GET(req: NextRequest) {
  const chain = getChain(req.nextUrl.searchParams.get("chain"));
  const wallet = req.nextUrl.searchParams.get("wallet") ?? "";
  const token = req.nextUrl.searchParams.get("token") ?? "";
  let pool = req.nextUrl.searchParams.get("pool") ?? "";

  const net = ALCHEMY_NET[chain.id];
  const key = process.env.ALCHEMY_API_KEY;
  if (!net) return NextResponse.json({ error: "Unsupported chain." }, { status: 400 });
  if (!key) return NextResponse.json({ error: "Server is missing ALCHEMY_API_KEY." }, { status: 500 });
  if (!isAddress(wallet) || !isAddress(token)) {
    return NextResponse.json({ error: "Invalid wallet or token address." }, { status: 400 });
  }

  const url = `https://${net}.g.alchemy.com/v2/${key}`;
  const client = createPublicClient({ transport: http(url) });

  try {
    // Token info + current price (and pool if not supplied)
    let currentPrice = 0;
    try {
      const tr = await fetch(`${GECKO}/networks/${chain.geckoNetwork}/tokens/${token}?include=top_pools`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (tr.ok) {
        const tj = await tr.json();
        currentPrice = Number(tj.data?.attributes?.price_usd ?? 0);
        if (!pool) {
          const id: string = tj.data?.relationships?.top_pools?.data?.[0]?.id ?? "";
          pool = id.includes("_") ? id.split("_")[1] : id;
        }
      }
    } catch {}

    const [balanceRaw, decimals, inc, out, hourly, daily] = await Promise.all([
      client.readContract({ address: token as `0x${string}`, abi: erc20Abi, functionName: "balanceOf", args: [wallet as `0x${string}`] }),
      client.readContract({ address: token as `0x${string}`, abi: erc20Abi, functionName: "decimals" }),
      fetchTransfers(url, token, wallet, "in"),
      fetchTransfers(url, token, wallet, "out"),
      pool ? fetchCandles(chain.geckoNetwork, pool, "hour") : Promise.resolve([] as Pt[]),
      pool ? fetchCandles(chain.geckoNetwork, pool, "day") : Promise.resolve([] as Pt[]),
    ]);

    const balance = Number(formatUnits(balanceRaw as bigint, decimals as number));
    const now = Math.floor(Date.now() / 1000);

    const all = [...inc.list, ...out.list]
      .filter((t) => Number.isFinite(t.ts))
      .map((t) => {
        const price = priceAt(hourly, daily, t.ts);
        return { ...t, price, volume: price * t.amount };
      })
      .sort((a, b) => b.ts - a.ts);

    const buys = all.filter((t) => t.type === "buy");
    const sells = all.filter((t) => t.type === "sell");
    const sum = (l: typeof all) => l.reduce((s, t) => s + t.volume, 0);

    const totalBuyUsd = sum(buys);
    const totalSellUsd = sum(sells);
    const boughtTokens = buys.reduce((s, t) => s + (t.price > 0 ? t.amount : 0), 0);
    const avgCostUsd = boughtTokens > 0 && totalBuyUsd > 0 ? totalBuyUsd / boughtTokens : null;
    const positionUsd = balance * currentPrice;
    const profitUsd = totalSellUsd + positionUsd - totalBuyUsd;

    const recent = all.filter((t) => now - t.ts <= WEEK);
    const buys7 = sum(recent.filter((t) => t.type === "buy"));
    const sells7 = sum(recent.filter((t) => t.type === "sell"));
    const sells7List = recent.filter((t) => t.type === "sell" && t.price > 0);
    const winRate7d =
      sells7List.length > 0 && avgCostUsd
        ? Math.round((sells7List.filter((t) => t.price > avgCostUsd).length / sells7List.length) * 100)
        : null;

    const oldest = all.length ? all[all.length - 1].ts : null;
    const ageDays = oldest ? Math.max(0, Math.floor((now - oldest) / 86400)) : null;

    const truncated = inc.more || out.more;

    return NextResponse.json({
      wallet,
      mint: token,
      profitUsd,
      positionUsd,
      positionTokens: balance,
      totalBuyUsd,
      totalSellUsd,
      avgCostUsd,
      winRate7d,
      profit7dUsd: sells7 - buys7,
      txCount7d: recent.length,
      ageDays,
      trades: all.slice(0, 30).map((t) => ({
        txHash: t.id,
        timestamp: t.ts,
        type: t.type,
        priceUsd: t.price,
        amount: t.amount,
        volumeUsd: t.volume,
      })),
      note: truncated
        ? "Based on this wallet's 500 most recent token transfers in each direction. Transfers between wallets count as buys/sells."
        : "Based on on-chain token transfers. Transfers between wallets count as buys/sells.",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to load wallet stats." }, { status: 502 });
  }
}
