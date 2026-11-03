import { NextRequest, NextResponse } from "next/server";
import { getChain } from "@/lib/chains";

export async function GET(req: NextRequest) {
  const chain = getChain(req.nextUrl.searchParams.get("chain"));
  const address = req.nextUrl.searchParams.get("address")?.toLowerCase();
  if (!address) return NextResponse.json({ error: "address required" }, { status: 400 });

  if (chain.type === "solana" || !chain.goplusChainId) {
    return NextResponse.json({ error: "use /api/security for solana" }, { status: 400 });
  }

  try {
    const r = await fetch(
      `https://api.gopluslabs.io/api/v1/token_security/${chain.goplusChainId}?contract_addresses=${address}`,
      { next: { revalidate: 60 } }
    );
    const d = (await r.json()).result?.[address];
    if (!d) return NextResponse.json({ error: "no data" }, { status: 404 });

    const flag = (v: any) => v === "1";
    const risks: string[] = [];
    if (flag(d.is_honeypot)) risks.push("Honeypot");
    if (flag(d.is_mintable)) risks.push("Mintable");
    if (flag(d.hidden_owner)) risks.push("Hidden owner");
    if (flag(d.can_take_back_ownership)) risks.push("Owner can reclaim ownership");
    if (flag(d.owner_change_balance)) risks.push("Owner can change balances");
    if (flag(d.is_blacklisted)) risks.push("Blacklist function");
    if (flag(d.transfer_pausable)) risks.push("Transfers can be paused");
    if (flag(d.cannot_sell_all)) risks.push("Cannot sell all");
    if (d.is_open_source === "0") risks.push("Contract not verified");
    const buyTax = Number(d.buy_tax ?? 0) * 100;
    const sellTax = Number(d.sell_tax ?? 0) * 100;
    if (buyTax > 10) risks.push(`High buy tax ${buyTax.toFixed(1)}%`);
    if (sellTax > 10) risks.push(`High sell tax ${sellTax.toFixed(1)}%`);

    const level =
      flag(d.is_honeypot) || sellTax > 50
        ? "danger"
        : risks.length > 2
        ? "warning"
        : risks.length
        ? "caution"
        : "safe";

    const score = Math.min(
      100,
      (flag(d.is_honeypot) ? 60 : 0) +
        risks.length * 10 +
        Math.min(30, Math.round(sellTax))
    );

    const holders = (d.holders ?? []).map((h: any) => ({
      address: h.address,
      pct: Number(h.percent ?? 0) * 100,
      isContract: h.is_contract === 1 || h.is_contract === "1",
      isLocked: h.is_locked === 1 || h.is_locked === "1",
      tag: h.tag || null,
      balance: Number(h.balance ?? 0),
    }));

    return NextResponse.json({
      chain: chain.id,
      address,
      level,
      score,
      risks,
      buyTax,
      sellTax,
      holderCount: Number(d.holder_count ?? 0),
      lpHolderCount: Number(d.lp_holder_count ?? 0),
      owner: d.owner_address || null,
      creator: d.creator_address || null,
      creatorPercent: d.creator_percent != null && d.creator_percent !== "" ? Number(d.creator_percent) * 100 : null,
      ownerPercent: d.owner_percent != null && d.owner_percent !== "" ? Number(d.owner_percent) * 100 : null,
      totalSupply: d.total_supply ?? null,
      holders,
    });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
