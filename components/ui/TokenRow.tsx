"use client";

import Link from "next/link";
import { useState } from "react";
import type { TokenSnapshot } from "@/types/ui";
import SecurityChips from "./SecurityChips";
import { fmtAge, fmtPct, fmtUsd } from "./format";

function Avatar({ src, symbol }: { src: string | null; symbol: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-bb-accent/10 text-sm font-bold text-bb-accent">
        {symbol[0]?.toUpperCase()}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={symbol}
      onError={() => setFailed(true)}
      className="h-11 w-11 shrink-0 rounded-full object-cover ring-1 ring-white/10"
    />
  );
}

function defaultHref(t: TokenSnapshot): string {
  if (t.chain === "solana") return `/terminal/token/${t.address}`;
  return `/terminal/evm-token/${t.chain}/${t.address}`;
}

interface Props {
  token: TokenSnapshot;
  href?: string;
  onBuy?: (t: TokenSnapshot) => void;
}

export default function TokenRow({ token: t, href, onBuy }: Props) {
  const up = (t.change24h ?? 0) >= 0;
  return (
    <div className="flex gap-3 border-b border-bb-border px-4 py-3 active:bg-bb-raised">
      <Link href={href ?? defaultHref(t)} className="flex min-w-0 flex-1 gap-3">
        <Avatar src={t.imageUrl} symbol={t.symbol} />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-[15px] font-semibold text-white">
              {t.symbol}
              <span className="ml-1.5 text-xs font-normal text-zinc-500">{fmtAge(t.ageSeconds)}</span>
            </p>
            <p className={`text-sm font-semibold tabular-nums ${up ? "text-bb-up" : "text-bb-down"}`}>
              {fmtPct(t.change24h)}
            </p>
          </div>
          <p className="text-xs text-zinc-400 tabular-nums">
            MC {fmtUsd(t.mcapUsd)} · Liq {fmtUsd(t.liquidityUsd)} · Vol {fmtUsd(t.volume24hUsd)}
          </p>
          <SecurityChips s={t.security} />
        </div>
      </Link>
      {onBuy && (
        <button
          onClick={() => onBuy(t)}
          className="self-center rounded-full bg-bb-accent px-3.5 py-2 text-xs font-bold text-black active:scale-95"
        >
          Buy
        </button>
      )}
    </div>
  );
}
