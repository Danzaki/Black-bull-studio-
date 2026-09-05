import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isValidSolanaAddress(address: string) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet");

  if (!wallet) {
    return NextResponse.json(
      { error: "Wallet address is required." },
      { status: 400 }
    );
  }

  if (!isValidSolanaAddress(wallet)) {
    return NextResponse.json(
      { error: "Invalid Solana wallet address." },
      { status: 400 }
    );
  }

  const apiKey = process.env.BIRDEYE_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Birdeye API key is not configured." },
      { status: 503 }
    );
  }

  try {
    const url = new URL(
      "https://public-api.birdeye.so/wallet/v2/pnl/details"
    );

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
        "x-chain": "solana",
      },
      body: JSON.stringify({
        wallet,
        duration: "all",
        position_scope: "cumulative",
        sort_by: "current_value",
        sort_type: "desc",
        offset: 0,
        limit: 100,
      }),
      cache: "no-store",
    });

    const text = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Unable to fetch wallet PnL from Birdeye.",
          details: text.slice(0, 1000),
        },
        { status: response.status }
      );
    }

    const payload = JSON.parse(text);
    const data = payload?.data;

    const tokenEntries = Array.isArray(data)
      ? data
      : Array.isArray(data?.tokens)
        ? data.tokens
        : data?.tokens && typeof data.tokens === "object"
          ? Object.entries(data.tokens).map(([mint, value]) => ({
              mint,
              ...(value as Record<string, unknown>),
            }))
          : [];

    const positions = tokenEntries
      .map((item: Record<string, unknown>) => {
        const mint =
          String(
            item.mint ??
              item.address ??
              item.token_address ??
              item.tokenAddress ??
              ""
          );

        const symbol = String(
          item.symbol ??
            (item.token_metadata as Record<string, unknown> | undefined)
              ?.symbol ??
            "UNKNOWN"
        );

        const amount = Number(
          item.amount ??
            item.quantity ??
            item.balance ??
            (item.position as Record<string, unknown> | undefined)?.amount ??
            0
        );

        const pricing =
          (item.pricing as Record<string, unknown> | undefined) ?? {};

        const cashflow =
          (item.cashflow_usd as Record<string, unknown> | undefined) ?? {};

        const pnl =
          (item.pnl as Record<string, unknown> | undefined) ?? {};

        const currentPrice = Number(
          pricing.current_price ??
            pricing.currentPrice ??
            item.current_price ??
            item.price ??
            0
        );

        const currentValue = Number(
          cashflow.current_value ??
            cashflow.currentValue ??
            item.current_value ??
            0
        );

        const unrealizedPnLUSD = Number(
          pnl.unrealized_usd ??
            pnl.unrealizedUsd ??
            item.unrealized_usd ??
            0
        );

        const totalInvested = Number(
          cashflow.total_invested ??
            cashflow.totalInvested ??
            item.total_invested ??
            0
        );

        const avgEntryPrice =
          amount > 0 && totalInvested > 0
            ? totalInvested / amount
            : 0;

        const unrealizedPnLPercent =
          totalInvested > 0
            ? (unrealizedPnLUSD / totalInvested) * 100
            : 0;

        return {
          id: mint,
          symbol,
          mint,
          amount,
          avgEntryPrice,
          currentPrice,
          unrealizedPnLUSD,
          unrealizedPnLPercent,
          currentValueUSD: currentValue,
        };
      })
      .filter(
        (position: {
          mint: string;
          amount: number;
          currentValueUSD: number;
        }) =>
          position.mint &&
          position.amount > 0 &&
          position.currentValueUSD >= 0
      );

    return NextResponse.json(
      {
        wallet,
        positions,
        updatedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Terminal positions error:", error);

    return NextResponse.json(
      {
        error: "Unable to load wallet positions.",
      },
      { status: 502 }
    );
  }
}
