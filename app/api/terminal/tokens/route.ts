import { NextRequest, NextResponse } from "next/server";

const JUPITER_TOKENS_URL = "https://api.jup.ag/tokens/v2/search";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({ success: true, tokens: [] });
  }

  const apiKey = process.env.JUPITER_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: "Jupiter API is not configured." },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `${JUPITER_TOKENS_URL}?query=${encodeURIComponent(query)}`,
      {
        headers: {
          "x-api-key": apiKey,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: "Unable to search Solana tokens." },
        { status: response.status }
      );
    }

    const data = await response.json();

    const rawTokens = Array.isArray(data) ? data : [];

    const tokens = rawTokens
      .filter(
        (token) =>
          typeof token?.id === "string" &&
          typeof token?.symbol === "string" &&
          typeof token?.name === "string"
      )
      .slice(0, 20)
      .map((token) => ({
        mint: token.id,
        symbol: token.symbol,
        name: token.name,
        decimals: Number(token.decimals ?? 0),
        logoURI: token.icon ?? undefined,
        price:
          typeof token.usdPrice === "number"
            ? token.usdPrice
            : undefined,
        change24h:
          typeof token.stats24h?.priceChange === "number"
            ? token.stats24h.priceChange
            : undefined,
        volume24h:
          typeof token.stats24h?.buyVolumeUSD === "number" &&
          typeof token.stats24h?.sellVolumeUSD === "number"
            ? token.stats24h.buyVolumeUSD +
              token.stats24h.sellVolumeUSD
            : undefined,
        liquidity:
          typeof token.liquidity === "number"
            ? token.liquidity
            : undefined,
        mcap:
          typeof token.mcap === "number"
            ? token.mcap
            : undefined,
      }));

    return NextResponse.json({
      success: true,
      tokens,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Token search failed." },
      { status: 502 }
    );
  }
}
