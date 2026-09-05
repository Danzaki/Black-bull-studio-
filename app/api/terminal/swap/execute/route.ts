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
