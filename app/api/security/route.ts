import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";

export const dynamic = "force-dynamic";

function getConnection(): Connection {
  const heliusKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
  return new Connection(
    heliusKey ? `https://mainnet.helius-rpc.com/?api-key=${heliusKey}` : "https://api.mainnet-beta.solana.com",
    "confirmed"
  );
}

async function checkMintAuthorities(connection: Connection, mint: PublicKey) {
  const accountInfo = await connection.getParsedAccountInfo(mint);
  const parsed = accountInfo.value?.data as any;
  const info = parsed?.parsed?.info;

  return {
    isMintable: info?.mintAuthority !== null && info?.mintAuthority !== undefined,
    isFreezable: info?.freezeAuthority !== null && info?.freezeAuthority !== undefined,
  };
}

async function findDevCandidate(connection: Connection, mint: PublicKey): Promise<string | null> {
  try {
    const signatures = await connection.getSignaturesForAddress(mint, { limit: 1000 });
    if (signatures.length === 0) return null;

    const oldest = signatures[signatures.length - 1];
    const tx = await connection.getParsedTransaction(oldest.signature, {
      maxSupportedTransactionVersion: 0,
    });

    const postBalances = tx?.meta?.postTokenBalances ?? [];
    const mintStr = mint.toBase58();

    let candidate: string | null = null;
    let maxAmount = 0;

    for (const bal of postBalances) {
      if (bal.mint !== mintStr) continue;
      const amount = bal.uiTokenAmount?.uiAmount ?? 0;
      if (amount > maxAmount && bal.owner) {
        maxAmount = amount;
        candidate = bal.owner;
      }
    }

    return candidate;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const mintParam = request.nextUrl.searchParams.get("mint");
  if (!mintParam) {
    return NextResponse.json({ error: "mint query parameter is required." }, { status: 400 });
  }

  let mint: PublicKey;
  try {
    mint = new PublicKey(mintParam);
  } catch {
    return NextResponse.json({ error: "Invalid mint address." }, { status: 400 });
  }

  try {
    const connection = getConnection();

    const [authorities, supplyInfo, largestAccounts, devCandidate] = await Promise.all([
      checkMintAuthorities(connection, mint),
      connection.getTokenSupply(mint),
      connection.getTokenLargestAccounts(mint),
      findDevCandidate(connection, mint),
    ]);

    const totalSupply = supplyInfo.value.uiAmount ?? 0;
    const topAccounts = largestAccounts.value.slice(0, 10);

    let top10Sum = 0;
    let deployerBalancePercent: number | null = null;

    for (const acc of topAccounts) {
      const uiAmount = acc.uiAmount ?? 0;
      const pct = totalSupply > 0 ? (uiAmount / totalSupply) * 100 : 0;
      top10Sum += pct;

      if (devCandidate) {
        try {
          const accountInfo = await connection.getParsedAccountInfo(acc.address);
          const owner = (accountInfo.value?.data as any)?.parsed?.info?.owner;
          if (owner === devCandidate) {
            deployerBalancePercent = Number(pct.toFixed(2));
          }
        } catch {
          // ignore
        }
      }
    }

    const top10HoldersPercent = Number(top10Sum.toFixed(2));

    // Deterministic score computed from real on-chain factors (not an external rating)
    let score = 100;
    if (authorities.isMintable) score -= 30;
    if (authorities.isFreezable) score -= 30;
    if (top10HoldersPercent > 50) score -= 25;
    else if (top10HoldersPercent > 30) score -= 10;
    if (deployerBalancePercent !== null && deployerBalancePercent > 10) score -= 15;
    score = Math.max(0, Math.min(100, score));

    const overallScore: "SAFE" | "WARNING" | "DANGER" =
      score >= 75 ? "SAFE" : score >= 45 ? "WARNING" : "DANGER";

    const report = {
      mint: mintParam,
      isMintable: authorities.isMintable,
      isFreezable: authorities.isFreezable,
      liquidityBurnedPercent: null, // not reliably determinable across all AMM types without a paid indexer
      top10HoldersPercent,
      deployerBalancePercent,
      overallScore,
      scoreNumber: score,
    };

    return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Security API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch security report.", details: error instanceof Error ? error.message : String(error) },
      { status: 502 }
    );
  }
}
