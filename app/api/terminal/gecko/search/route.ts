import { NextRequest, NextResponse } from "next/server";

const BASE_URL = "https://api.geckoterminal.com/api/v2";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query")?.trim();

  if (!query) {
    return NextResponse.json(
      { error: "Search query is required." },
      { status: 400 }
    );
  }

  try {
    const url = `${BASE_URL}/search/pools?query=${encodeURIComponent(
      query
    )}&network=solana&include=base_token`;

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 15 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Unable to fetch Solana market search." },
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
