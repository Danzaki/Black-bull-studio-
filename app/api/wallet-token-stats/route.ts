import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const WSOL_MINT = "So11111111111111111111111111111111111111112";
const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;

interface Trade {
  txHash: string;
  timestamp: number;
  type: "buy" | "sell";
  tokenAmount: number;
  solAmount: number;
}

async function getSolPriceUsd(): Promise<number> {
  try {
    const res = await fetch(`https://lite-api.jup.ag/price/v3?ids=${WSOL_MINT}`);
    const json = await res.json();
    return json[WSOL_MINT]?.usdPrice ?? 0;
  } catch {
    return 0;
  }
}

async function getCurrentPosition(
  wallet: string,
  mint: string,
  heliusKey: string
): Promise<{ balance: number; valueUsd: number | null }> {
  try {
    const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${heliusKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "position",
        method: "getAssetsByOwner",
        params: { ownerAddress: wallet, page: 1, limit: 100, displayOptions: { showFungible: true } },
      }),
    });
    const json = await res.json();
    const items = json.result?.items ?? [];
    const match = items.find((i: any) => i.id === mint);
    if (!match) return { balance: 0, valueUsd: 0 };

    const info = match.token_info || {};
    const decimals = info.decimals ?? 0;
    const balance = (info.balance ?? 0) / Math.pow(10, decimals);
    const valueUsd = info.price_info?.total_price ?? null;

    return { balance, valueUsd };
  } catch {
    return { balance: 0, valueUsd: null };
  }
}

async function getTradeHistory(
  wallet: string,
  mint: string,
  heliusKey: string
): Promise<Trade[]> {
  try {
    const url = `https://api.helius.xyz/v0/addresses/${encodeURIComponent(
      wallet
    )}/transactions?api-key=${heliusKey}&type=SWAP&limit=100`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];

    const txs = await res.json();
    if (!Array.isArray(txs)) return [];

    const trades: Trade[] = [];

    for (const tx of txs) {
      const tokenTransfers = Array.isArray(tx.tokenTransfers) ? tx.tokenTransfers : [];
      const nativeTransfers = Array.isArray(tx.nativeTransfers) ? tx.nativeTransfers : [];

      const tokenLeg = tokenTransfers.find((t: any) => t.mint === mint);
      if (!tokenLeg) continue;

      const isBuy = tokenLeg.toUserAccount === wallet;
      const isSell = tokenLeg.fromUserAccount === wallet;
      if (!isBuy && !isSell) continue;

      // Prefer an explicit WSOL token-transfer leg if present
      const wsolLeg = tokenTransfers.find((t: any) => t.mint === WSOL_MINT);
      let solAmount = 0;

      if (wsolLeg) {
        solAmount = Math.abs(wsolLeg.tokenAmount ?? 0);
      } else {
        // Fall back to native SOL transfers (common for bonding-curve / AMM swaps)
        const relevant = nativeTransfers.filter((t: any) =>
          isBuy ? t.fromUserAccount === wallet : t.toUserAccount === wallet
        );
        const lamports = relevant.reduce((sum: number, t: any) => sum + (t.amount ?? 0), 0);
        solAmount = lamports / 1_000_000_000;
      }

      if (solAmount <= 0) continue;

      trades.push({
        txHash: tx.signature,
        timestamp: tx.timestamp,
        type: isBuy ? "buy" : "sell",
        tokenAmount: Math.abs(tokenLeg.tokenAmount ?? 0),
        solAmount,
      });
    }

    return trades.sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
}

function computeFifoWinRate(trades: Trade[], cutoffTs: number) {
  // Process oldest -> newest, maintain a FIFO buy queue, evaluate sells within the window
  const chronological = [...trades].sort((a, b) => a.timestamp - b.timestamp);
  const buyQueue: { amount: number; solAmount: number }[] = [];

  let winsInWindow = 0;
  let sellsInWindow = 0;

  for (const t of chronological) {
    if (t.type === "buy") {
      buyQueue.push({ amount: t.tokenAmount, solAmount: t.solAmount });
      continue;
    }

    // sell: match FIFO
    let remaining = t.tokenAmount;
    let costBasisSol = 0;

    while (remaining > 0 && buyQueue.length > 0) {
      const lot = buyQueue[0];
      const lotUnitCost = lot.amount > 0 ? lot.solAmount / lot.amount : 0;
      const take = Math.min(remaining, lot.amount);

      costBasisSol += take * lotUnitCost;
      lot.amount -= take;
      lot.solAmount -= take * lotUnitCost;
      remaining -= take;

      if (lot.amount <= 0) buyQueue.shift();
    }

    if (t.timestamp >= cutoffTs) {
      sellsInWindow += 1;
      if (t.solAmount > costBasisSol) winsInWindow += 1;
    }
  }

  return sellsInWindow > 0 ? Number(((winsInWindow / sellsInWindow) * 100).toFixed(0)) : null;
}

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet");
  const mint = request.nextUrl.searchParams.get("mint");

  if (!wallet || !mint) {
    return NextResponse.json({ error: "wallet and mint query parameters are required." }, { status: 400 });
  }

  const heliusKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
  if (!heliusKey) {
    return NextResponse.json({ error: "Helius API key is not configured." }, { status: 503 });
  }

  try {
    const [solPriceUsd, position, trades] = await Promise.all([
      getSolPriceUsd(),
      getCurrentPosition(wallet, mint, heliusKey),
      getTradeHistory(wallet, mint, heliusKey),
    ]);

    const nowSec = Date.now() / 1000;
    const cutoff7d = nowSec - SEVEN_DAYS_SECONDS;

    const totalBuySol = trades.filter((t) => t.type === "buy").reduce((s, t) => s + t.solAmount, 0);
    const totalSellSol = trades.filter((t) => t.type === "sell").reduce((s, t) => s + t.solAmount, 0);
    const totalBuyTokens = trades.filter((t) => t.type === "buy").reduce((s, t) => s + t.tokenAmount, 0);

    const avgCostUsd = totalBuyTokens > 0 ? (totalBuySol * solPriceUsd) / totalBuyTokens : null;

    const totalBuyUsd = totalBuySol * solPriceUsd;
    const totalSellUsd = totalSellSol * solPriceUsd;
    const positionUsd = position.valueUsd ?? 0;

    const profitUsd = positionUsd + totalSellUsd - totalBuyUsd;

    const trades7d = trades.filter((t) => t.timestamp >= cutoff7d);
    const buy7dSol = trades7d.filter((t) => t.type === "buy").reduce((s, t) => s + t.solAmount, 0);
    const sell7dSol = trades7d.filter((t) => t.type === "sell").reduce((s, t) => s + t.solAmount, 0);
    const profit7dUsd = (sell7dSol - buy7dSol) * solPriceUsd;

    const winRate7d = computeFifoWinRate(trades, cutoff7d);

    const oldestTrade = trades.length > 0 ? trades[trades.length - 1] : null;
    const ageDays = oldestTrade ? Math.floor((nowSec - oldestTrade.timestamp) / 86400) : null;

    return NextResponse.json(
      {
        wallet,
        mint,
        solPriceUsd,
        profitUsd: Number(profitUsd.toFixed(2)),
        positionUsd: Number(positionUsd.toFixed(2)),
        positionTokens: position.balance,
        totalBuyUsd: Number(totalBuyUsd.toFixed(2)),
        totalSellUsd: Number(totalSellUsd.toFixed(2)),
        avgCostUsd,
        winRate7d,
        profit7dUsd: Number(profit7dUsd.toFixed(2)),
        txCount7d: trades7d.length,
        ageDays,
        trades: trades.slice(0, 30).map((t) => ({
          txHash: t.txHash,
          timestamp: t.timestamp,
          type: t.type,
          priceUsd: t.tokenAmount > 0 ? Number(((t.solAmount * solPriceUsd) / t.tokenAmount).toFixed(6)) : 0,
          amount: t.tokenAmount,
          volumeUsd: Number((t.solAmount * solPriceUsd).toFixed(2)),
        })),
        note: "Trade history covers the wallet's 100 most recent swaps; very active wallets may not show a full 7-day window.",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("wallet-token-stats error:", error);
    return NextResponse.json(
      { error: "Failed to compute wallet token stats.", details: error instanceof Error ? error.message : String(error) },
      { status: 502 }
    );
  }
}
