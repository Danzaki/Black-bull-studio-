import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const address = request.nextUrl.searchParams.get("address") ?? "";
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
    return NextResponse.json({ error: "Invalid address." }, { status: 400 });
  }
  const key = process.env.HELIUS_API_KEY ?? process.env.NEXT_PUBLIC_HELIUS_API_KEY;
  if (!key) return NextResponse.json({ error: "Not configured." }, { status: 500 });

  try {
    const res = await fetch(
      `https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${key}&type=SWAP&limit=10`,
      { cache: "no-store" }
    );
    if (!res.ok) return NextResponse.json({ error: "Upstream error." }, { status: 502 });
    return NextResponse.json(await res.json(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Upstream unavailable." }, { status: 502 });
  }
}
