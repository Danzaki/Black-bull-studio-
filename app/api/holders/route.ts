import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";

export const dynamic = "force-dynamic";

const SYSTEM_PROGRAM = "11111111111111111111111111111111111111111".slice(0, 44);
const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

function getConnection(): Connection {
  const heliusKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
  return new Connection(
    heliusKey ? `https://mainnet.helius-rpc.com/?api-key=${heliusKey}` : "https://api.mainnet-beta.solana.com",
    "confirmed"
  );
}

function formatBalance(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(2);
}

async function findDevCandidate(
  connection: Connection,
  mint: PublicKey
): Promise<string | null> {
  try {
    const signatures = await connection.getSignaturesForAddress(mint, { limit: 1000 });
    if (signatures.length === 0) return null;

    // Oldest signature in this page (best-effort - may not be true genesis for very old/high-volume tokens)
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

    const [supplyInfo, largestAccounts, devCandidate] = await Promise.all([
      connection.getTokenSupply(mint),
      connection.getTokenLargestAccounts(mint),
      findDevCandidate(connection, mint),
    ]);

    const totalSupply = supplyInfo.value.uiAmount ?? 0;
    const topAccounts = largestAccounts.value.slice(0, 15);

    const holderDetails = await Promise.all(
      topAccounts.map(async (acc) => {
        try {
          const accountInfo = await connection.getParsedAccountInfo(acc.address);
          const parsed = accountInfo.value?.data as any;
          const owner: string | null = parsed?.parsed?.info?.owner ?? null;

          let isProgramControlled = false;
          if (owner) {
            const ownerInfo = await connection.getAccountInfo(new PublicKey(owner));
            const controllingProgram = ownerInfo?.owner?.toBase58();
            isProgramControlled = Boolean(
              controllingProgram &&
                controllingProgram !== SYSTEM_PROGRAM &&
                controllingProgram !== TOKEN_PROGRAM &&
                controllingProgram !== TOKEN_2022_PROGRAM
            );
          }

          const uiAmount = acc.uiAmount ?? 0;

          return {
            address: owner || acc.address.toBase58(),
            percentage: totalSupply > 0 ? Number(((uiAmount / totalSupply) * 100).toFixed(2)) : 0,
            balanceFormatted: formatBalance(uiAmount),
            isProgramControlled,
            isDevCandidate: owner === devCandidate,
          };
        } catch {
          return {
            address: acc.address.toBase58(),
            percentage: 0,
            balanceFormatted: formatBalance(acc.uiAmount ?? 0),
            isProgramControlled: false,
            isDevCandidate: false,
          };
        }
      })
    );

    const top10Percentage = Number(
      holderDetails.slice(0, 10).reduce((sum, h) => sum + h.percentage, 0).toFixed(2)
    );

    const devHolder = holderDetails.find((h) => h.isDevCandidate);

    const data = {
      mint: mintParam,
      totalSupply,
      top10Percentage,
      devCandidateAddress: devCandidate,
      devCandidatePercentage: devHolder ? devHolder.percentage : null,
      holders: holderDetails,
      note:
        "Dev candidate is a best-effort guess based on the earliest detected mint transaction, not a confirmed identity.",
    };

    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Holders API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch holder distribution.", details: error instanceof Error ? error.message : String(error) },
      { status: 502 }
    );
  }
}
