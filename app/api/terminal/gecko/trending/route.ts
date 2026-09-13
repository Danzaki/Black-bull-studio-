import { NextRequest, NextResponse } from "next/server";

const BASE_URL = "https://api.geckoterminal.com/api/v2";

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category") || "hot";
  const page = request.nextUrl.searchParams.get("page") || "1";

  const endpoint =
    category === "new"
      ? `/networks/solana/new_pools?page=${page}&include=base_token`
      : `/networks/solana/trending_pools?page=${page}&include=base_token`;

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 10 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Unable to fetch Solana markets." },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Unable to reach market data provider." },
      { status: 502 }
    );
  }
}
