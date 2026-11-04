"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { TokenSnapshot } from "@/types/ui";
import SecurityChips from "./SecurityChips";
import { fmtAge, fmtPct, fmtUsd } from "./format";

function Avatar({ src, symbol }: { src: string | null; symbol: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bb-accent/10 text-xs font-bold text-bb-accent">
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
      className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-white/10"
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
  const prev = useRef(t.mcapUsd);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    const p = prev.current;
    prev.current = t.mcapUsd;
    if (p == null || t.mcapUsd == null || p === t.mcapUsd) return;
    setFlash(t.mcapUsd > p ? "up" : "down");
    const id = setTimeout(() => setFlash(null), 600);
    return () => clearTimeout(id);
  }, [t.mcapUsd]);

  return (
    <div
      className={`flex items-center gap-2 border-b border-bb-border px-3 py-2 active:bg-bb-raised ${
        flash === "up" ? "bb-flash-up" : flash === "down" ? "bb-flash-down" : ""
      }`}
    >
      <Link href={href ?? defaultHref(t)} className="flex min-w-0 flex-1 items-center gap-2.5">
        <Avatar src={t.imageUrl} symbol={t.symbol} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[13px] font-semibold text-white">
              {t.symbol}
              <span className="ml-1.5 text-[10px] font-normal text-zinc-500">{fmtAge(t.ageSeconds)}</span>
            </p>
            <p className={`text-[13px] font-semibold tabular-nums ${up ? "text-bb-up" : "text-bb-down"}`}>
              {fmtPct(t.change24h)}
            </p>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-zinc-400 tabular-nums">
            MC {fmtUsd(t.mcapUsd)} · Liq {fmtUsd(t.liquidityUsd)} · V {fmtUsd(t.volume24hUsd)}
          </p>
          <div className="mt-1">
            <SecurityChips s={t.security} />
          </div>
        </div>
      </Link>
      {onBuy && (
        <button
          onClick={() => onBuy(t)}
          className="shrink-0 rounded-md bg-bb-accent px-2.5 py-1.5 text-[11px] font-bold text-black active:scale-95"
        >
          ⚡ Buy
        </button>
      )}
    </div>
  );
}
