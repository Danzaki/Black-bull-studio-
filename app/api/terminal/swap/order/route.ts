import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const JUPITER_URL = "https://api.jup.ag/ultra/v1/order";

export async function GET(request: NextRequest) {
  const apiKey = process.env.JUPITER_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Jupiter API key is not configured." },
      { status: 503 }
    );
  }

  const search = request.nextUrl.searchParams;
  const inputMint = search.get("inputMint");
  const outputMint = search.get("outputMint");
  const amount = search.get("amount");
  const taker = search.get("taker");

  if (!inputMint || !outputMint || !amount || !taker) {
    return NextResponse.json(
      { error: "inputMint, outputMint, amount and taker are required." },
      { status: 400 }
    );
  }

  if (!/^\d+$/.test(amount) || amount === "0") {
    return NextResponse.json(
      { error: "amount must be a positive integer in base units." },
      { status: 400 }
    );
  }

  const url = new URL(JUPITER_URL);
  url.searchParams.set("inputMint", inputMint);
  url.searchParams.set("outputMint", outputMint);
  url.searchParams.set("amount", amount);
  url.searchParams.set("taker", taker);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "x-api-key": apiKey,
      },
      cache: "no-store",
    });

    const text = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Jupiter order request failed.",
          details: text.slice(0, 1000),
        },
        { status: response.status }
      );
    }

    return new NextResponse(text, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to reach Jupiter." },
      { status: 502 }
    );
  }
}
