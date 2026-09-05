#!/data/data/com.termux/files/usr/bin/bash
set -e

echo "== Black Bull Studio: Jupiter Ultra =="

mkdir -p app/api/terminal/swap/order
mkdir -p app/api/terminal/swap/execute

if [ ! -f .env.local ]; then
  touch .env.local
fi

if ! grep -q '^JUPITER_API_KEY=' .env.local; then
  printf '\n# Jupiter Ultra API key (server-side only)\nJUPITER_API_KEY=\n' >> .env.local
  echo "Added JUPITER_API_KEY placeholder."
else
  echo "JUPITER_API_KEY already exists. Value untouched."
fi

cat > app/api/terminal/swap/order/route.ts <<'ROUTE'
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
ROUTE

cat > app/api/terminal/swap/execute/route.ts <<'ROUTE'
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const JUPITER_URL = "https://api.jup.ag/ultra/v1/execute";

export async function POST(request: NextRequest) {
  const apiKey = process.env.JUPITER_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Jupiter API key is not configured." },
      { status: 503 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const payload = body as Record<string, unknown>;

  if (
    typeof payload.signedTransaction !== "string" ||
    typeof payload.requestId !== "string" ||
    !payload.signedTransaction ||
    !payload.requestId
  ) {
    return NextResponse.json(
      {
        error:
          "signedTransaction and requestId are required.",
      },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(JUPITER_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        signedTransaction: payload.signedTransaction,
        requestId: payload.requestId,
      }),
      cache: "no-store",
    });

    const text = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Jupiter execution failed.",
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
      { error: "Unable to reach Jupiter execution service." },
      { status: 502 }
    );
  }
}
ROUTE

echo
echo "== Created files =="
find app/api/terminal/swap -type f -print

echo
echo "== TypeScript =="
npx tsc --noEmit

echo
echo "== Done =="
