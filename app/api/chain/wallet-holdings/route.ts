import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, formatEther, formatUnits, http, isAddress } from "viem";
import { getChain } from "@/lib/chains";

export const dynamic = "force-dynamic";

const ALCHEMY_NET: Record<string, string> = { bsc: "bnb-mainnet", base: "base-mainnet" };
const WRAPPED: Record<string, string> = {
  bsc: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
  base: "0x4200000000000000000000000000000000000006",
};
const GECKO = "https://api.geckoterminal.com/api/v2";

function cleanImage(u: unknown): string | null {
  return typeof u === "string" && u.startsWith("http") && !u.includes("missing") ? u : null;
}

export async function GET(req: NextRequest) {
  const chain = getChain(req.nextUrl.searchParams.get("chain"));
  const wallet = req.nextUrl.searchParams.get("wallet") ?? "";

  const net = ALCHEMY_NET[chain.id];
  const key = process.env.ALCHEMY_API_KEY;
  if (!net) return NextResponse.json({ error: "Unsupported chain." }, { status: 400 });
  if (!key) return NextResponse.json({ error: "Server is missing ALCHEMY_API_KEY." }, { status: 500 });
  if (!isAddress(wallet)) return NextResponse.json({ error: "Invalid wallet address." }, { status: 400 });

  const url = `https://${net}.g.alchemy.com/v2/${key}`;
  const client = createPublicClient({ transport: http(url) });

  try {
    // 1) token balances + native balance
    const [balRes, nativeWei] = await Promise.all([
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "alchemy_getTokenBalances", params: [wallet, "erc20"] }),
      }).then((r) => r.json()),
      client.getBalance({ address: wallet as `0x${string}` }),
    ]);

    if (balRes.error) throw new Error(balRes.error.message || "balance lookup failed");

    const raw: { address: string; hex: string }[] = [];
    for (const t of balRes.result?.tokenBalances ?? []) {
      try {
        if (t.tokenBalance && BigInt(t.tokenBalance) > BigInt(0)) {
          raw.push({ address: String(t.contractAddress).toLowerCase(), hex: t.tokenBalance });
        }
      } catch {}
    }
    const candidates = raw.slice(0, 90);

    // 2) prices, names, images (only listed tokens get a price, which filters spam)
    const priced = new Map<string, any>();
    for (let i = 0; i < candidates.length; i += 30) {
      const chunk = candidates.slice(i, i + 30).map((c) => c.address).join(",");
      try {
        const r = await fetch(`${GECKO}/networks/${chain.geckoNetwork}/tokens/multi/${chunk}`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!r.ok) continue;
        for (const d of (await r.json()).data ?? []) {
          const a = d.attributes ?? {};
          priced.set(String(a.address).toLowerCase(), a);
        }
      } catch {}
    }

    const holdings = candidates
      .map((c) => {
        const a = priced.get(c.address);
        if (!a || !a.price_usd || a.decimals == null) return null;
        const balance = Number(formatUnits(BigInt(c.hex), Number(a.decimals)));
        const price = Number(a.price_usd);
        return {
          address: c.address,
          symbol: a.symbol ?? "?",
          name: a.name ?? a.symbol ?? "Unknown",
          imageUrl: cleanImage(a.image_url),
          decimals: Number(a.decimals),
          balance,
          priceUsd: price,
          valueUsd: balance * price,
        };
      })
      .filter((h): h is NonNullable<typeof h> => h !== null && h.valueUsd >= 0.01)
      .sort((a, b) => b.valueUsd - a.valueUsd);

    // 3) native coin value (price taken from the wrapped token)
    let nativePrice = 0;
    try {
      const nr = await fetch(`${GECKO}/networks/${chain.geckoNetwork}/tokens/${WRAPPED[chain.id]}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (nr.ok) nativePrice = Number((await nr.json()).data?.attributes?.price_usd ?? 0);
    } catch {}
    const nativeBalance = Number(formatEther(nativeWei));
    const native = {
      symbol: chain.nativeSymbol,
      balance: nativeBalance,
      priceUsd: nativePrice,
      valueUsd: nativeBalance * nativePrice,
    };

    const totalValueUsd = native.valueUsd + holdings.reduce((s, h) => s + h.valueUsd, 0);
    const hiddenCount = Math.max(0, raw.length - holdings.length);

    return NextResponse.json({ chain: chain.id, wallet, native, holdings, totalValueUsd, hiddenCount });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to load wallet." }, { status: 502 });
  }
}
