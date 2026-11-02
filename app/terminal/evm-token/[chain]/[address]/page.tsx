"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, Copy, ExternalLink, ShieldAlert, ShieldCheck } from "lucide-react";
import { getChain, isChainId, explorerTokenUrl } from "@/lib/chains";

function compact(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n) || n === 0) return "—";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function price(p: number | null | undefined): string {
  if (!p) return "—";
  if (p >= 1) return `$${p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  if (p >= 0.01) return `$${p.toFixed(4)}`;
  return `$${p.toPrecision(3)}`;
}

const LEVEL_STYLE: Record<string, string> = {
  safe: "border-bb-up/20 bg-bb-up/10 text-bb-up",
  caution: "border-amber-500/20 bg-amber-500/5 text-amber-400",
  warning: "border-orange-500/30 bg-orange-500/10 text-orange-400",
  danger: "border-bb-down/30 bg-bb-down/10 text-bb-down",
};

export default function EvmTokenPage() {
  const params = useParams();
  const search = useSearchParams();
  const router = useRouter();

  const chainParam = String(params?.chain ?? "");
  const address = String(params?.address ?? "");
  const chain = getChain(chainParam);
  const valid = isChainId(chainParam) && chain.type === "evm";

  const [token, setToken] = useState<any>(null);
  const [security, setSecurity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [secLoading, setSecLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!valid || !address) return;
    let alive = true;
    const load = () =>
      fetch(`/api/chain/token?chain=${chain.id}&address=${address}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => { if (alive) { setToken(j); setLoading(false); } })
        .catch(() => { if (alive) setLoading(false); });
    load();
    const t = setInterval(load, 15000);
    return () => { alive = false; clearInterval(t); };
  }, [valid, chain.id, address]);

  useEffect(() => {
    if (!valid || !address) return;
    let alive = true;
    fetch(`/api/chain/security?chain=${chain.id}&address=${address}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (alive) { setSecurity(j); setSecLoading(false); } })
      .catch(() => { if (alive) setSecLoading(false); });
    return () => { alive = false; };
  }, [valid, chain.id, address]);

  if (!valid) {
    return (
      <div className="min-h-screen bg-bb-bg p-6 text-center text-zinc-400">
        Unsupported chain.
      </div>
    );
  }

  const symbol = token?.symbol || search.get("symbol") || "TOKEN";
  const pool = token?.pool || search.get("pool");
  const change = token?.change24h as number | null | undefined;
  const isUp = change != null && change >= 0;

  async function copyAddr() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  }

  return (
    <div className="min-h-screen bg-bb-bg pb-24 text-zinc-100">
      <header className="sticky top-0 z-40 border-b border-bb-border/90 bg-bb-bg/95 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1500px] items-center gap-3 px-3 sm:px-5">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-bb-raised hover:text-white"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          {token?.imageUrl ? (
            <img src={token.imageUrl} alt={symbol} className="h-8 w-8 rounded-full object-cover ring-1 ring-white/10" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-bb-border bg-bb-surface text-[11px] font-black text-zinc-300">
              {symbol.slice(0, 2).toUpperCase()}
            </div>
          )}

          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-white">
              {symbol}
              {token?.name && <span className="ml-2 hidden text-[11px] font-normal text-zinc-600 sm:inline">{token.name}</span>}
            </div>
            <button onClick={copyAddr} className="flex items-center gap-1 text-[11px] text-zinc-600 hover:text-zinc-300">
              <span>{address.slice(0, 6)}…{address.slice(-6)}</span>
              {copied ? <Check className="h-3 w-3 text-bb-accent" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>

          <a
            href={explorerTokenUrl(chain.id, address)}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex h-8 items-center gap-1.5 rounded-lg border border-bb-border px-2.5 text-[11px] font-medium text-zinc-500 hover:border-zinc-700 hover:text-white"
          >
            {chain.id === "bsc" ? "BscScan" : "BaseScan"}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-5 px-3 py-4 sm:px-5">
        {/* Hero */}
        <section className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="rounded-md border border-bb-up/20 bg-bb-up/10 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-bb-accent">
              {chain.name}
            </span>
            <div className="mt-2 flex items-end gap-3">
              {loading ? (
                <div className="bb-skeleton h-10 w-48" />
              ) : (
                <h1 className={`text-2xl font-black tracking-tight sm:text-3xl ${change == null ? "text-white" : isUp ? "text-bb-up" : "text-bb-down"}`}>
                  {price(token?.priceUsd)}
                </h1>
              )}
              {change != null && (
                <span className={`mb-1 rounded-md px-2 py-1 text-xs font-bold ${isUp ? "bg-bb-up/10 text-bb-up" : "bg-bb-down/10 text-bb-down"}`}>
                  {isUp ? "+" : ""}{change.toFixed(2)}%
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-4">
            {[
              ["MC", compact(token?.marketCap)],
              ["Liq", compact(token?.liquidity)],
              ["Vol", compact(token?.volume24h)],
            ].map(([k, v]) => (
              <div key={k}>
                <span className="text-[11px] uppercase tracking-wider text-zinc-500">{k} </span>
                <span className="font-bold text-white">{v}</span>
              </div>
            ))}
            <div>
              <span className="text-[11px] uppercase tracking-wider text-zinc-500">B/S </span>
              <span className="font-bold">
                <span className="text-bb-up">{token?.buys24h ?? "—"}</span>
                <span className="mx-1 text-zinc-700">/</span>
                <span className="text-bb-down">{token?.sells24h ?? "—"}</span>
              </span>
            </div>
          </div>
        </section>

        {/* Chart */}
        <section className="overflow-hidden rounded-2xl border border-bb-border bg-bb-surface h-[50vh]">
          {pool ? (
            <iframe
              title="chart"
              src={`https://www.geckoterminal.com/${chain.geckoNetwork}/pools/${pool}?embed=1&info=0&swaps=0&light_chart=0`}
              className="h-full w-full border-0"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">
              {loading ? "Loading chart…" : "No pool found for this token."}
            </div>
          )}
        </section>

        {/* Security */}
        <section className="rounded-2xl border border-bb-border bg-bb-surface p-4">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Security scan</h2>
          {secLoading ? (
            <div className="bb-skeleton h-24 w-full" />
          ) : !security ? (
            <p className="text-sm text-zinc-500">No security data available for this token.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-bold uppercase tracking-wider ${LEVEL_STYLE[security.level] ?? LEVEL_STYLE.caution}`}>
                  {security.level === "safe" ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                  {security.level}
                </span>
                <span className="text-xs text-zinc-400">Buy tax {security.buyTax.toFixed(1)}%</span>
                <span className="text-xs text-zinc-400">Sell tax {security.sellTax.toFixed(1)}%</span>
                <span className="text-xs text-zinc-400">Holders {security.holderCount.toLocaleString()}</span>
              </div>
              {security.risks.length > 0 ? (
                <ul className="space-y-1.5">
                  {security.risks.map((r: string) => (
                    <li key={r} className="flex items-center gap-2 text-sm text-zinc-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-bb-down" />
                      {r}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-bb-up">No major risks detected.</p>
              )}
              <p className="text-[11px] text-zinc-600">Powered by GoPlus. Not financial advice.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
