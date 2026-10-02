import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ids = request.nextUrl.searchParams.get("ids")?.trim();
  if (!ids) return NextResponse.json({ error: "ids required" }, { status: 400 });

  try {
    const res = await fetch(`https://lite-api.jup.ag/price/v3?ids=${encodeURIComponent(ids)}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ error: "upstream" }, { status: res.status });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ error: "unreachable" }, { status: 502 });
  }
}
