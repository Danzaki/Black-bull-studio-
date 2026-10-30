import { NextResponse } from "next/server";
import { ANSEM_MINT } from "@/lib/ansemFacts";

export const revalidate = 30;

export async function GET() {
  if (!ANSEM_MINT) return NextResponse.json({ error: "No mint" }, { status: 404 });
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${ANSEM_MINT}`, { next: { revalidate: 30 } });
    if (!res.ok) return NextResponse.json({ error: "Market data unavailable" }, { status: 502 });
    const json = await res.json();
    const pairs: any[] = (json?.pairs ?? []).filter((p: any) => p?.chainId === "solana");
    pairs.sort((a, b) => (b?.liquidity?.usd ?? 0) - (a?.liquidity?.usd ?? 0));
    const p = pairs[0];
    if (!p) return NextResponse.json({ error: "No pair found" }, { status: 404 });
    const NAME_OK = /ansem|black\s*bull/i.test(String(p.baseToken?.symbol ?? "") + " " + String(p.baseToken?.name ?? ""));
    if (!NAME_OK) return NextResponse.json({ error: "Token name does not match" }, { status: 404 });
    return NextResponse.json({
      price: Number(p.priceUsd) || null,
      marketCap: p.marketCap ?? p.fdv ?? null,
      liquidity: p.liquidity?.usd ?? null,
      volume24h: p.volume?.h24 ?? null,
      change24h: p.priceChange?.h24 ?? null,
      url: typeof p.url === "string" ? p.url : null,
      name: p.baseToken?.name ?? null,
      symbol: p.baseToken?.symbol ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Market data unavailable" }, { status: 502 });
  }
}
