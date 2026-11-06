import { NextRequest, NextResponse } from "next/server";
import { CHAINS, isChainId } from "@/lib/chains";

const EVM_ADDR_RE = /^0x[a-fA-F0-9]{40}$/;

const flag = (v: unknown): boolean | null =>
  v === "1" || v === 1 ? true : v === "0" || v === 0 ? false : null;

const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : null;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ chain: string; address: string }> }
) {
  const { chain: chainParam, address } = await params;

  if (!isChainId(chainParam)) {
    return NextResponse.json({ error: "Unsupported chain." }, { status: 400 });
  }
  const chain = CHAINS[chainParam];
  if (chain.type !== "evm" || !chain.goplusChainId) {
    return NextResponse.json({ error: "This chain is not supported by the scanner." }, { status: 400 });
  }
  if (!EVM_ADDR_RE.test(address)) {
    return NextResponse.json({ error: "Invalid token address." }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(
      `https://api.gopluslabs.io/api/v1/token_security/${chain.goplusChainId}?contract_addresses=${address.toLowerCase()}`,
      { headers: { Accept: "application/json" }, signal: controller.signal, next: { revalidate: 120 } }
    );
    if (!res.ok) {
      return NextResponse.json({ error: "Security provider unavailable." }, { status: 502 });
    }
    const json = await res.json();
    const d = json?.result?.[address.toLowerCase()];
    if (!d) {
      return NextResponse.json({ error: "No security data for this token yet." }, { status: 404 });
    }

    const buyTax = num(d.buy_tax);
    const sellTax = num(d.sell_tax);
    const signals = {
      honeypot: flag(d.is_honeypot),
      cannotSellAll: flag(d.cannot_sell_all),
      mintable: flag(d.is_mintable),
      openSource: flag(d.is_open_source),
      proxy: flag(d.is_proxy),
      hiddenOwner: flag(d.hidden_owner),
      canTakeBackOwnership: flag(d.can_take_back_ownership),
      transferPausable: flag(d.transfer_pausable),
      hasBlacklist: flag(d.is_blacklisted),
    };

    const danger =
      signals.honeypot === true ||
      signals.cannotSellAll === true ||
      (buyTax ?? 0) >= 0.5 ||
      (sellTax ?? 0) >= 0.5;
    const warning =
      signals.mintable === true ||
      signals.hiddenOwner === true ||
      signals.canTakeBackOwnership === true ||
      signals.transferPausable === true ||
      signals.openSource === false ||
      (buyTax ?? 0) >= 0.1 ||
      (sellTax ?? 0) >= 0.1;

    return NextResponse.json({
      chain: chain.id,
      chainName: chain.name,
      address,
      name: d.token_name ?? null,
      symbol: d.token_symbol ?? null,
      level: danger ? "danger" : warning ? "warning" : "ok",
      buyTaxPct: buyTax === null ? null : Math.round(buyTax * 1000) / 10,
      sellTaxPct: sellTax === null ? null : Math.round(sellTax * 1000) / 10,
      holderCount: num(d.holder_count),
      ownerPercent: num(d.owner_percent),
      creatorPercent: num(d.creator_percent),
      signals,
      note: "A screen of known risk signals. Not a guarantee that a token is safe and not financial advice.",
    });
  } catch {
    return NextResponse.json({ error: "Scan failed. Try again." }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
