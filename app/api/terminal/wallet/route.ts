import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SOLANA_RPC =
  process.env.NEXT_PUBLIC_HELIUS_API_KEY
    ? `https://mainnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`
    : "https://api.mainnet-beta.solana.com";

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet");

  if (!wallet) {
    return NextResponse.json(
      { error: "wallet is required." },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(SOLANA_RPC, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getBalance",
        params: [wallet],
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Unable to fetch wallet balance from Solana RPC." },
        { status: 502 }
      );
    }

    const data = await response.json();

    if (data.error) {
      return NextResponse.json(
        { error: data.error.message || "Solana RPC returned an error." },
        { status: 502 }
      );
    }

    const lamports = Number(data.result?.value ?? 0);
    const solBalance = lamports / 1_000_000_000;

    return NextResponse.json(
      {
        address: wallet,
        solBalance,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to reach Solana RPC." },
      { status: 502 }
    );
  }
}
