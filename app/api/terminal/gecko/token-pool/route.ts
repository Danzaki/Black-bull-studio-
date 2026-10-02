import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const mint = request.nextUrl.searchParams.get("mint")?.trim();
  if (!mint) return NextResponse.json({ error: "mint required" }, { status: 400 });

  try {
    const res = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/solana/tokens/${encodeURIComponent(mint)}/pools?page=1`,
      { headers: { Accept: "application/json" }, cache: "no-store" }
    );
    if (!res.ok) return NextResponse.json({ error: "upstream" }, { status: res.status });
    const json = await res.json();
    const pool = json.data?.[0]?.attributes?.address ?? null;
    return NextResponse.json({ pool });
  } catch {
    return NextResponse.json({ error: "unreachable" }, { status: 502 });
  }
}
