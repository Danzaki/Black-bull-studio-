"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Check, Copy, ExternalLink, ShieldAlert, ShieldCheck,
  TrendingDown, TrendingUp, Zap,
} from "lucide-react";
import { getChain, isChainId, explorerTokenUrl, explorerAddressUrl } from "@/lib/chains";
import { useChainOHLCV } from "@/hooks/useChainOHLCV";
import { useChainTrades } from "@/hooks/useChainTrades";
import type { Timeframe } from "@/types/terminal";

const SolanaTradingChart = dynamic(() => import("@/components/terminal/SolanaTradingChart"), {
  ssr: false,
  loading: () => <div className="h-[400px] animate-pulse bg-white/5 rounded-xl" />,
});

const EvmWalletStatsModal = dynamic(() => import("@/components/terminal/EvmWalletStatsModal"), { ssr: false, loading: () => null });

const TIMEFRAMES: Timeframe[] = ["1m", "5m", "15m", "1h", "4h", "1d"];
const TABS = ["Markets", "Holders", "Detail", "History", "Risk"] as const;
type Tab = (typeof TABS)[number];

const SUB = "₀₁₂₃₄₅₆₇₈₉";
function formatPrice(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  if (v === 0) return "$0";
  const a = Math.abs(v);
  if (a >= 1) return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  if (a >= 0.01) return `$${v.toFixed(4)}`;
  const zeros = Math.floor(-Math.log10(a)) - 1;
  if (zeros >= 4) {
    const digits = Math.round(a * Math.pow(10, zeros + 4)).toString().slice(0, 4);
    const sub = String(zeros).split("").map((d) => SUB[Number(d)]).join("");
    return `$0.0${sub}${digits}`;
  }
  return `$${v.toPrecision(4)}`;
}
function formatCompact(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v) || v === 0) return "—";
  const a = Math.abs(v);
  if (a >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}
function shortAddress(v: string | null | undefined): string {
  if (!v) return "—";
  return v.length <= 12 ? v : `${v.slice(0, 6)}…${v.slice(-6)}`;
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bb-skeleton ${className}`} aria-hidden="true" />;
}
function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{title}</h2>
      {action}
    </div>
  );
}
function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-bb-border bg-bb-bg px-5 py-10 text-center">
      <p className="text-sm font-medium text-zinc-300">{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-zinc-600">{description}</p>
    </div>
  );
}
function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-bb-border bg-bb-surface p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-2 text-lg font-bold tabular-nums text-zinc-100">{value}</p>
    </div>
  );
}
function DetailRow({ label, value, onCopy }: { label: string; value: string; onCopy?: () => void }) {
  return (
    <div className="flex min-h-14 flex-col justify-center gap-1 border-b border-bb-border px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <span className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</span>
      <div className="flex min-w-0 items-center gap-2 sm:max-w-[70%]">
        <span className="truncate text-xs text-zinc-300">{value}</span>
        {onCopy && (
          <button type="button" onClick={onCopy} className="shrink-0 rounded-md p-1 text-zinc-500 hover:bg-bb-raised hover:text-white" aria-label={`Copy ${label}`}>
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function TradeTable({ trades, onSelectTrader }: { trades: any[]; onSelectTrader: (a: string) => void }) {
  const cols = "grid grid-cols-[64px_minmax(0,1fr)_minmax(0,1fr)_90px_80px] gap-2 border-b border-bb-border px-4 py-3.5 text-xs last:border-b-0";
  return (
    <div className="overflow-hidden rounded-2xl border border-bb-border bg-bb-surface">
      <div className="grid grid-cols-[64px_minmax(0,1fr)_minmax(0,1fr)_90px_80px] gap-2 border-b border-bb-border px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        <span>Time</span>
        <span className="text-right">Price</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Vol</span>
        <span className="text-right">User</span>
      </div>
      {trades.map((t) => {
        const isBuy = t.kind === "buy";
        const amount = isBuy ? t.toAmount : t.fromAmount;
        const content = (
          <>
            <span className="truncate text-zinc-500">
              {new Date(t.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span className={`text-right font-semibold tabular-nums ${isBuy ? "text-bb-up" : "text-bb-down"}`}>
              {formatPrice(t.priceUsd)}
            </span>
            <span className="truncate text-right tabular-nums text-zinc-300">
              {amount != null ? amount.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
            </span>
            <span className="text-right tabular-nums text-zinc-300">
              {t.volumeUsd !== null ? `$${t.volumeUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
            </span>
            <span className="truncate text-right text-zinc-500">{shortAddress(t.traderAddress)}</span>
          </>
        );
        return t.traderAddress ? (
          <button key={t.id} type="button" onClick={() => onSelectTrader(t.traderAddress)} className={`${cols} w-full text-left transition hover:bg-bb-raised/30`}>
            {content}
          </button>
        ) : (
          <div key={t.id} className={cols}>{content}</div>
        );
      })}
    </div>
  );
}function EvmTokenInner() {
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
  const [activeTab, setActiveTab] = useState<Tab>("Markets");
  const [timeframe, setTimeframe] = useState<Timeframe>("1h");
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState("");
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);

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

  const symbol = token?.symbol || search.get("symbol") || "TOKEN";
  const name = token?.name || symbol;
  const pool: string | null = token?.pool || search.get("pool");

  const { candles, loading: chartLoading } = useChainOHLCV(chain.id, pool, timeframe);
  const { trades, loading: tradesLoading } = useChainTrades(chain.id, pool, address);

  if (!valid) {
    return <div className="min-h-screen bg-bb-bg p-6 text-center text-zinc-400">Unsupported chain.</div>;
  }

  const price: number | null = token?.priceUsd || null;
  const change: number | null = token?.change24h ?? null;
  const isUp = change !== null && change >= 0;

  async function copyAddr() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  }
  function openTrade(mode: "Buy" | "Sell") {
    setNotice(`${mode} on ${chain.name} is coming soon. Trading is live on Solana only for now.`);
    setTimeout(() => setNotice(""), 3500);
  }

  const riskColor =
    security?.score == null ? "" :
    security.score < 30 ? "border-bb-up/20 bg-bb-up/10 text-bb-up" :
    security.score < 60 ? "border-amber-500/20 bg-amber-500/5 text-amber-400" :
    "border-bb-down/20 bg-bb-down/10 text-bb-down";

  return (
    <div className="min-h-screen bg-bb-bg pb-24 text-zinc-100">
      <header className="sticky top-0 z-40 border-b border-bb-border/90 bg-bb-bg/95 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1500px] items-center gap-3 px-3 sm:px-5">
          <button type="button" onClick={() => router.back()} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-bb-raised hover:text-white" aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 items-center gap-2">
            {token?.imageUrl ? (
              <img src={token.imageUrl} alt={symbol} className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-white/10" />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-bb-border bg-bb-surface text-[11px] font-black text-zinc-300">
                {symbol.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-bold text-white">{symbol}</span>
                <span className="hidden text-[11px] text-zinc-600 sm:inline">{name}</span>
              </div>
              <button type="button" onClick={copyAddr} className="flex max-w-[190px] items-center gap-1 text-[11px] text-zinc-600 transition hover:text-zinc-300">
                <span className="truncate">{shortAddress(address)}</span>
                {copied ? <Check className="h-3 w-3 text-bb-accent" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <a href={explorerTokenUrl(chain.id, address)} target="_blank" rel="noopener noreferrer" className="flex h-8 items-center gap-1.5 rounded-lg border border-bb-border px-2.5 text-[11px] font-medium text-zinc-500 transition hover:border-zinc-700 hover:text-white">
              {chain.id === "bsc" ? "BscScan" : "BaseScan"}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px]">
        <section className="border-b border-bb-border/80 px-3 py-3 sm:px-5">
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded-md border border-bb-up/20 bg-bb-up/10 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-bb-accent">{chain.name}</span>
                {security?.score != null && (
                  <span className={`rounded-md border px-2 py-1 text-[11px] font-bold uppercase tracking-wider ${riskColor}`}>Risk {security.score}/100</span>
                )}
              </div>
              <div className="flex items-end gap-3">
                {loading && !token ? (
                  <Skeleton className="h-10 w-48" />
                ) : (
                  <h1 className={`text-xl font-black tabular-nums tracking-tight sm:text-3xl ${change === null ? "text-white" : isUp ? "text-bb-up" : "text-bb-down"}`}>
                    {formatPrice(price)}
                  </h1>
                )}
                {change !== null && (
                  <span className={`mb-1 flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold ${isUp ? "bg-bb-up/10 text-bb-up" : "bg-bb-down/10 text-bb-down"}`}>
                    {isUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                    {change.toFixed(2)}%
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1.5 text-left lg:w-[420px]">
              {[["MC", formatCompact(token?.marketCap)], ["Liq", formatCompact(token?.liquidity)], ["Vol", formatCompact(token?.volume24h)]].map(([k, v]) => (
                <div key={k} className="flex flex-col rounded-lg bg-bb-raised px-2 py-1 text-[13px]">
                  <span className="text-[11px] uppercase tracking-wider text-zinc-500">{k}</span>
                  <span className="font-bold text-white">{v}</span>
                </div>
              ))}
              <div className="flex flex-col rounded-lg bg-bb-raised px-2 py-1 text-[13px]">
                <span className="text-[11px] uppercase tracking-wider text-zinc-500">B/S</span>
                <span className="font-bold">
                  <span className="text-bb-up">{token?.buys24h ?? "—"}</span>
                  <span className="mx-1 text-zinc-700">/</span>
                  <span className="text-bb-down">{token?.sells24h ?? "—"}</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        <nav className="sticky top-14 z-30 border-b border-bb-border bg-bb-bg/95 px-3 backdrop-blur-xl sm:px-5">
          <div className="flex gap-5 overflow-x-auto no-scrollbar">
            {TABS.map((tab) => (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`relative whitespace-nowrap py-2.5 text-[13px] font-semibold transition ${activeTab === tab ? "text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
                {tab}
                {activeTab === tab && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-bb-accent" />}
              </button>
            ))}
          </div>
        </nav>

        <div className="px-3 py-3 sm:px-5">
          {activeTab === "Markets" && (
            <div className="grid gap-4">
              <section className="min-w-0">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-1 rounded-lg border border-bb-border bg-bb-surface p-1">
                    {TIMEFRAMES.map((tf) => (
                      <button key={tf} type="button" onClick={() => setTimeframe(tf)} className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${timeframe === tf ? "bg-bb-raised text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
                        {tf}
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] uppercase tracking-wider text-zinc-500">{pool ? `Pool ${shortAddress(pool)}` : "No pool"}</span>
                </div>
                <div className="h-[52vh] overflow-hidden rounded-2xl border border-bb-border bg-bb-surface">
                  <SolanaTradingChart symbol={symbol} candles={candles} loading={chartLoading} livePrice={price} marketCap={token?.marketCap ?? null} />
                </div>
              </section>
              <section className="min-w-0">
                <SectionTitle
                  title="Recent activity"
                  action={<button type="button" onClick={() => setActiveTab("History")} className="text-xs font-semibold text-zinc-400 hover:text-white">View all</button>}
                />
                {tradesLoading && trades.length === 0 ? (
                  <div className="space-y-1.5">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : trades.length === 0 ? (
                  <EmptyState title="No recent trades" description="There is no recent trade activity available for this pool." />
                ) : (
                  <TradeTable trades={trades.slice(0, 5)} onSelectTrader={setSelectedWallet} />
                )}
              </section>
            </div>
          )}

          {activeTab === "History" && (
            <section className="max-w-5xl">
              <SectionTitle title="Trade history" />
              {tradesLoading && trades.length === 0 ? (
                <div className="space-y-1.5">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : trades.length === 0 ? (
                <EmptyState title="No recent trades" description="There is no recent trade activity available for this pool." />
              ) : (
                <TradeTable trades={trades} onSelectTrader={setSelectedWallet} />
              )}
            </section>
          )}

          {activeTab === "Holders" && (
            <section className="max-w-5xl">
              <SectionTitle title="Holder distribution" />
              {secLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-24 w-full" />
                  {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : !security ? (
                <EmptyState title="Holder data unavailable" description="No holder distribution data is currently available for this token." />
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <InfoBox label="Total holders" value={Number(security.holderCount).toLocaleString()} />
                    <InfoBox label="Top holder" value={security.holders[0] ? `${security.holders[0].pct.toFixed(2)}%` : "—"} />
                    <InfoBox label="Top 5" value={security.holders.length ? `${security.holders.slice(0, 5).reduce((s: number, h: any) => s + h.pct, 0).toFixed(2)}%` : "—"} />
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-bb-border bg-bb-surface">
                    <div className="grid grid-cols-[52px_minmax(0,1fr)_100px] border-b border-bb-border px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                      <span>#</span><span>Wallet</span><span className="text-right">Share</span>
                    </div>
                    {security.holders.map((h: any, i: number) => (
                      <button key={h.address} type="button" onClick={() => setSelectedWallet(h.address)} className="grid w-full grid-cols-[52px_minmax(0,1fr)_100px] items-center border-b border-bb-border px-4 py-3.5 text-left transition last:border-b-0 hover:bg-bb-raised">
                        <span className="text-xs font-bold text-zinc-500">{String(i + 1).padStart(2, "0")}</span>
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm text-zinc-300">{shortAddress(h.address)}</span>
                          {h.isContract && <span className="shrink-0 rounded border border-zinc-700 px-1.5 py-0.5 text-[11px] font-bold uppercase text-zinc-400">{h.isLocked ? "Locked" : "Contract"}</span>}
                        </span>
                        <span className="text-right text-sm font-semibold tabular-nums text-zinc-200">{h.pct.toFixed(2)}%</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {activeTab === "Risk" && (
            <section className="max-w-5xl">
              <SectionTitle title="Security scan" />
              {secLoading ? (
                <Skeleton className="h-36 w-full" />
              ) : !security ? (
                <EmptyState title="No security data" description="Security data is not available for this token." />
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <InfoBox label="Risk score" value={`${security.score}/100`} />
                    <InfoBox label="Buy tax" value={`${security.buyTax.toFixed(1)}%`} />
                    <InfoBox label="Sell tax" value={`${security.sellTax.toFixed(1)}%`} />
                    <InfoBox label="LP holders" value={Number(security.lpHolderCount).toLocaleString()} />
                  </div>
                  <div className="rounded-2xl border border-bb-border bg-bb-surface p-4">
                    <div className="mb-3 flex items-center gap-2">
                      {security.level === "safe" ? <ShieldCheck className="h-4 w-4 text-bb-up" /> : <ShieldAlert className="h-4 w-4 text-bb-down" />}
                      <span className="text-sm font-bold uppercase tracking-wider text-white">{security.level}</span>
                    </div>
                    {security.risks.length > 0 ? (
                      <ul className="space-y-2">
                        {security.risks.map((r: string) => (
                          <li key={r} className="flex items-center gap-2 text-sm text-zinc-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-bb-down" />{r}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-bb-up">No major risks detected.</p>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}

          {activeTab === "Detail" && (
            <section className="max-w-5xl">
              <SectionTitle title="Token details" />
              <div className="overflow-hidden rounded-2xl border border-bb-border bg-bb-surface">
                <DetailRow label="Name" value={name} />
                <DetailRow label="Symbol" value={`$${symbol}`} />
                <DetailRow label="Network" value={chain.name} />
                <DetailRow label="Decimals" value={String(token?.decimals ?? "—")} />
                <DetailRow label="Contract" value={address} onCopy={copyAddr} />
                <DetailRow label="Pool" value={pool || "—"} onCopy={pool ? () => navigator.clipboard.writeText(pool) : undefined} />
                {security?.owner && <DetailRow label="Owner" value={security.owner} />}
                {security?.creator && <DetailRow label="Creator" value={security.creator} />}
                <DetailRow label="Price" value={formatPrice(price)} />
                <DetailRow label="Market cap" value={formatCompact(token?.marketCap)} />
                <DetailRow label="Fully diluted valuation" value={formatCompact(token?.fdv)} />
                <DetailRow label="Liquidity" value={formatCompact(token?.liquidity)} />
              </div>
            </section>
          )}
        </div>
      </main>

      {selectedWallet && (
        <EvmWalletStatsModal
          chain={chain.id}
          wallet={selectedWallet}
          token={address}
          pool={pool}
          tokenSymbol={symbol}
          onClose={() => setSelectedWallet(null)}
        />
      )}

      {notice && (
        <div className="fixed inset-x-3 bottom-24 z-50 rounded-xl border border-bb-border bg-bb-surface px-4 py-3 text-center text-xs text-zinc-300 shadow-2xl">
          {notice}
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-bb-border bg-bb-bg/95 p-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] backdrop-blur-xl sm:p-3">
        <div className="mx-auto grid max-w-[1500px] grid-cols-2 gap-2.5">
          <button type="button" onClick={() => openTrade("Buy")} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-bb-up text-base font-bold text-black transition-all duration-150 active:scale-[0.97]">
            <Zap className="h-4 w-4 fill-current" />Buy {symbol}
          </button>
          <button type="button" onClick={() => openTrade("Sell")} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-bb-down text-base font-bold text-black transition-all duration-150 active:scale-[0.97]">
            <TrendingDown className="h-4 w-4" />Sell {symbol}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EvmTokenPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bb-bg" aria-label="Loading token" />}>
      <EvmTokenInner />
    </Suspense>
  );
}
