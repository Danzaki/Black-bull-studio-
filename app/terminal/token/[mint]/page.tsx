"use client";

import dynamic from "next/dynamic";

import { Suspense, useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Check,
  Copy,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Star,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";

const SolanaTradingChart = dynamic(() => import("@/components/terminal/SolanaTradingChart"), { ssr: false, loading: () => <div className="h-[400px] animate-pulse bg-white/5 rounded-xl" /> });
const TokenTradeSheet = dynamic(() => import("@/components/terminal/TokenTradeSheet"), { ssr: false, loading: () => null });
const SetAlertModal = dynamic(() => import("@/components/terminal/SetAlertModal"), { ssr: false, loading: () => null });
import { useWatchlist } from "@/hooks/useWatchlist";

import { usePoolDetails } from "@/hooks/usePoolDetails";
import { useTokenTrades } from "@/hooks/useTokenTrades";
import { useSolanaWebSocket } from "@/hooks/useSolanaWebSocket";
import { useRugCheck } from "@/hooks/useRugCheck";
import { useTokenOHLCV } from "@/hooks/useTokenOHLCV";
import { useSolanaPrice } from "@/hooks/useSolanaPrice";
import { useCurveDetails } from "@/hooks/useCurveDetails";
import { useCurveCandles } from "@/hooks/useCurveCandles";

import type { Timeframe, TokenInfo } from "@/types/terminal";
import { rpcFetch } from '@/lib/rpcClient';

const TIMEFRAMES: Timeframe[] = ["1m", "5m", "15m", "1h", "4h", "1d"];

const TABS = [
  "Markets",
  "Holders",
  "Detail",
  "History",
  "Risk",
] as const;

type Tab = (typeof TABS)[number];

const WalletTokenStatsModal = dynamic(() => import("@/components/terminal/WalletTokenStatsModal"), { ssr: false, loading: () => null });
const RiskTab = dynamic(() => import("@/components/terminal/token-tabs/RiskTab"), { ssr: false, loading: () => <div className="h-36 animate-pulse bg-white/5 rounded-2xl" /> });


function formatCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }

  const absolute = Math.abs(value);

  if (absolute >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }

  if (absolute >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }

  if (absolute >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }

  return `$${value.toFixed(2)}`;
}

function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }

  if (value === 0) return "$0";

  if (Math.abs(value) >= 1) {
    return `$${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    })}`;
  }

  if (Math.abs(value) >= 0.01) return `$${value.toFixed(4)}`;
  const zeros = Math.floor(-Math.log10(Math.abs(value))) - 1;
  if (zeros >= 4) {
    const digits = Math.round(Math.abs(value) * Math.pow(10, zeros + 4)).toString().slice(0, 4);
    const sub = String(zeros).split("").map((d) => "₀₁₂₃₄₅₆₇₈₉"[Number(d)]).join("");
    return `$0.0${sub}${digits}`;
  }
  return `$${value.toPrecision(4)}`;
}

function shortAddress(value: string | null | undefined): string {
  if (!value) return "—";
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}…${value.slice(-6)}`;
}

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bb-skeleton ${className}`}
      aria-hidden="true"
    />
  );
}

function Metric({
  label,
  value,
  positive,
  negative,
}: {
  label: string;
  value: React.ReactNode;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="min-w-0 border-l border-bb-border pl-4 first:border-l-0 first:pl-0">
      <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p
        className={`mt-1.5 truncate text-sm font-semibold tabular-nums ${
          positive
            ? "text-bb-accent"
            : negative
              ? "text-bb-down"
              : "text-zinc-100"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function SectionTitle({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        {title}
      </h2>
      {action}
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-bb-border bg-bb-bg px-5 py-10 text-center">
      <p className="text-sm font-medium text-zinc-300">{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-zinc-600">
        {description}
      </p>
    </div>
  );
}

function TokenDetailInner() {
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const mint = typeof params?.mint === "string" ? params.mint : "";
  const poolParam = searchParams.get("pool");
  const mintParam = Array.isArray(params.mint) ? params.mint[0] : (params.mint as string | undefined);
  const [resolvedPool, setResolvedPool] = useState<string | null>(null);
  useEffect(() => {
    if (poolParam || !mintParam) return;
    let alive = true;
    fetch(`/api/terminal/gecko/token-pool?mint=${encodeURIComponent(mintParam)}`)
      .then((r) => r.json())
      .then((j) => { if (alive && j?.pool) setResolvedPool(j.pool); })
      .catch(() => {});
    return () => { alive = false; };
  }, [poolParam, mintParam]);
  const poolAddress = poolParam || resolvedPool;
  const symbol = searchParams.get("symbol") || "TOKEN";
  const name = searchParams.get("name") || symbol;
  const decimalsParam = searchParams.get("decimals");
  const [resolvedDecimals, setResolvedDecimals] = useState<number | null>(null);
  useEffect(() => {
    if (decimalsParam || !mint) return;
    let alive = true;
    rpcFetch({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getTokenSupply", params: [mint] }),
    })
      .then((r) => r.json())
      .then((j) => {
        const d = j?.result?.value?.decimals;
        if (alive && typeof d === "number") setResolvedDecimals(d);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [decimalsParam, mint]);
  const decimalsReady = Boolean(decimalsParam) || resolvedDecimals !== null;
  const decimals = decimalsParam
    ? Number.parseInt(decimalsParam, 10)
    : (resolvedDecimals ?? 6);

  const [activeTab, setActiveTab] = useState<Tab>("Markets");
  const [timeframe, setTimeframe] = useState<Timeframe>("1h");
  const [tradeSheetOpen, setTradeSheetOpen] = useState(false);
  const [tradeMode, setTradeMode] = useState<"BUY" | "SELL">("BUY");
  const [alertOpen, setAlertOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const heliusWsUrl = process.env.NEXT_PUBLIC_HELIUS_API_KEY
    ? `wss://mainnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`
    : "wss://api.mainnet-beta.solana.com";

  const { latestLog } = useSolanaWebSocket(heliusWsUrl, poolAddress);

  const [poolRefreshTrigger, setPoolRefreshTrigger] = useState(0);
  useEffect(() => {
    if (latestLog?.signature) {
      setPoolRefreshTrigger(Date.now());
    }
  }, [latestLog?.signature]);

  const { details, loading: detailsLoading } = usePoolDetails(
    poolAddress,
    poolRefreshTrigger
  );
  const { candles, loading: chartLoading } = useTokenOHLCV(
    poolAddress,
    timeframe,
  );
  const { trades, loading: tradesLoading } = useTokenTrades(poolAddress, mint || null);
  const { report, loading: reportLoading } = useRugCheck(mint || null);

  const token: TokenInfo = {
    symbol,
    name,
    mint,
    decimals,
    poolAddress: poolAddress || undefined,
  };

  const { price: livePrice } = useSolanaPrice(mint);
  const curveUsd = useCurveDetails(mint, !poolAddress);
  const price = livePrice ?? details?.priceUsd ?? curveUsd?.priceUsd ?? null;
  const mcapUsd = details?.marketCapUsd ?? curveUsd?.mcapUsd ?? null;
  const liqUsd = details?.liquidityUsd ?? curveUsd?.liqUsd ?? null;
  const curveCandles = useCurveCandles(mint, curveUsd?.priceUsd ?? null, curveUsd?.updatedAt ?? 0, timeframe);
  const chartCandles = candles.length > 0 ? candles : curveCandles;
  const change24h = details?.priceChange24h ?? null;
  const isUp = change24h !== null && change24h >= 0;
  const { isFavorited, toggleFavorite } = useWatchlist();

  function openTrade(mode: "BUY" | "SELL") {
    if (!decimalsReady) return;
    setTradeMode(mode);
    setTradeSheetOpen(true);
  }

  async function copyMint() {
    if (!mint) return;

    try {
      await navigator.clipboard.writeText(mint);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="min-h-screen bg-bb-bg pb-24 text-zinc-100">
      {/* Top terminal bar */}
      <header className="sticky top-0 z-40 border-b border-bb-border/90 bg-bb-bg/95 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1500px] items-center gap-3 px-3 sm:px-5">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-bb-raised hover:text-white"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="flex min-w-0 items-center gap-2">
            {details?.imageUrl ? (
              <img
                src={details.imageUrl}
                alt={symbol}
                className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-white/10"
              />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-bb-border bg-bb-surface text-[11px] font-black text-zinc-300">
                {symbol.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-bold text-white">
                  {symbol}
                </span>
                <span className="hidden text-[11px] text-zinc-600 sm:inline">
                  {name}
                </span>
              </div>

              <button
                type="button"
                onClick={copyMint}
                className="flex max-w-[190px] items-center gap-1 text-[11px] text-zinc-600 transition hover:text-zinc-300"
              >
                <span className="truncate">{shortAddress(mint)}</span>
                {copied ? (
                  <Check className="h-3 w-3 text-bb-accent" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <a
              href={mint ? `https://solscan.io/token/${mint}` : "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden h-8 items-center gap-1.5 rounded-lg border border-bb-border px-2.5 text-[11px] font-medium text-zinc-500 transition hover:border-zinc-700 hover:text-white sm:flex"
            >
              Solscan
              <ExternalLink className="h-3 w-3" />
            </a>

            <button
              type="button"
              onClick={() =>
                toggleFavorite({
                  mint,
                  symbol,
                  name,
                  imageUrl: details?.imageUrl ?? null,
                  poolAddress: poolAddress || undefined,
                  decimals,
                })
              }
              className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                isFavorited(mint)
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                  : "border-bb-border text-zinc-500 hover:border-zinc-700 hover:text-amber-400"
              }`}
              aria-label="Favorite"
            >
              <Star className={`h-4 w-4 ${isFavorited(mint) ? "fill-current" : ""}`} />
            </button>

            <button
              type="button"
              onClick={() => setAlertOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-bb-border text-zinc-500 transition hover:border-zinc-700 hover:text-bb-accent"
              aria-label="Set price alert"
            >
              <Bell className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px]">
        {/* Token hero */}
        <section className="border-b border-bb-border/80 px-3 py-3 sm:px-5 sm:py-3">
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded-md border border-bb-up/20 bg-bb-up/10 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-bb-accent">
                  Solana
                </span>
                {report?.scoreNormalised !== undefined && (
                  <span
                    className={`rounded-md border px-2 py-1 text-[11px] font-bold uppercase tracking-wider ${
                      report.scoreNormalised < 30
                        ? "border-bb-up/20 bg-bb-up/10 text-bb-up"
                        : report.scoreNormalised < 60
                          ? "border-amber-500/20 bg-amber-500/5 text-amber-400"
                          : "border-bb-down/20 bg-bb-down/10 text-bb-down"
                    }`}
                  >
                    Risk {report.scoreNormalised}/100
                  </span>
                )}
              </div>

              <div className="flex items-end gap-3">
                {detailsLoading && !details ? (
                  <Skeleton className="h-10 w-48" />
                ) : (
                  <h1
                    className={`text-2xl font-black tracking-tight sm:text-3xl ${
                      change24h === null ? "text-white" : isUp ? "text-bb-up" : "text-bb-down"
                    }`}
                  >
                    {formatPrice(price)}
                  </h1>
                )}

                {!detailsLoading && change24h !== null && (
                  <span
                    className={`mb-1 flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold ${
                      isUp
                        ? "bg-bb-up/10 text-bb-up"
                        : "bg-bb-down/10 text-bb-down"
                    }`}
                  >
                    {isUp ? (
                      <TrendingUp className="h-3.5 w-3.5" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5" />
                    )}
                    {change24h.toFixed(2)}%
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-1.5 text-right">
              <div className="flex items-center justify-end gap-2 text-sm">
                <span className="text-zinc-500 text-[11px] uppercase tracking-wider">MC</span>
                <span className="font-bold text-white">{formatCompact(mcapUsd)}</span>
              </div>
              <div className="flex items-center justify-end gap-2 text-sm">
                <span className="text-zinc-500 text-[11px] uppercase tracking-wider">Liq</span>
                <span className="font-bold text-white">{formatCompact(liqUsd)}</span>
              </div>
              <div className="flex items-center justify-end gap-2 text-sm">
                <span className="text-zinc-500 text-[11px] uppercase tracking-wider">Vol</span>
                <span className="font-bold text-white">{formatCompact(details?.volume24h)}</span>
              </div>
              <div className="flex items-center justify-end gap-2 text-sm">
                <span className="text-zinc-500 text-[11px] uppercase tracking-wider">B/S</span>
                <span className="font-bold">
                  <span className="text-bb-up">{details?.buys24h ?? "—"}</span>
                  <span className="mx-1 text-zinc-700">/</span>
                  <span className="text-bb-down">{details?.sells24h ?? "—"}</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Navigation */}
        <nav className="sticky top-14 z-30 border-b border-bb-border bg-bb-bg/95 px-3 backdrop-blur-xl sm:px-5">
          <div className="flex gap-5 overflow-x-auto no-scrollbar">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`relative whitespace-nowrap py-3.5 text-sm font-semibold transition ${
                  activeTab === tab
                    ? "text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-bb-accent" />
                )}
              </button>
            ))}
          </div>
        </nav>

        <div className="px-3 py-5 sm:px-5">
          {/* Overview */}
          {activeTab === "Markets" && (
            <div className="grid gap-4">
              <section className="min-w-0">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-1 rounded-lg border border-bb-border bg-bb-surface p-1">
                    {TIMEFRAMES.map((tf) => (
                      <button
                        key={tf}
                        type="button"
                        onClick={() => setTimeframe(tf)}
                        className={`rounded-md px-3 py-2 text-xs font-semibold transition ${
                          timeframe === tf
                            ? "bg-bb-raised text-white"
                            : "text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>

                  <span className="text-[11px] uppercase tracking-wider text-zinc-500">
                    {poolAddress ? `Pool ${shortAddress(poolAddress)}` : (curveUsd ? "Bonding curve · live" : "No pool")}
                  </span>
                </div>

                <div className="overflow-hidden rounded-2xl border border-bb-border bg-bb-surface h-[45vh]">
                  <SolanaTradingChart
                    symbol={symbol}
                    candles={chartCandles}
                    loading={chartLoading}
                    livePrice={price}
                    marketCap={mcapUsd}
                  />
                </div>
              </section>

              <section className="min-w-0">
                <SectionTitle
                  title="Recent activity"
                  action={
                    <button
                      type="button"
                      onClick={() => setActiveTab("History")}
                      className="text-xs font-semibold text-zinc-400 hover:text-white"
                    >
                      View all
                    </button>
                  }
                />

                {tradesLoading && trades.length === 0 ? (
                  <div className="space-y-1.5">
                    {[1, 2, 3].map((item) => (
                      <Skeleton key={item} className="h-12 w-full" />
                    ))}
                  </div>
                ) : trades.length === 0 ? (
                  <EmptyState
                    title="No recent trades"
                    description="There is no recent trade activity available for this pool."
                  />
                ) : (
                  <TradeTable trades={trades.slice(0, 5)} onSelectTrader={setSelectedWallet} />
                )}
              </section>
            </div>
          )}

          {/* History */}
          {activeTab === "History" && (
            <section className="max-w-5xl">
              <SectionTitle title="Trade history" />

              {tradesLoading && trades.length === 0 ? (
                <div className="space-y-1.5">
                  {[1, 2, 3, 4].map((item) => (
                    <Skeleton key={item} className="h-12 w-full" />
                  ))}
                </div>
              ) : trades.length === 0 ? (
                <EmptyState
                  title="No recent trades"
                  description="There is no recent trade activity available for this pool."
                />
              ) : (
                <TradeTable trades={trades} onSelectTrader={setSelectedWallet} />
              )}
            </section>
          )}

          {/* Holders */}
          {activeTab === "Holders" && (
            <section className="max-w-5xl">
              <SectionTitle title="Holder distribution" />

              {reportLoading && !report ? (
                <div className="space-y-2">
                  <Skeleton className="h-24 w-full" />
                  {[1, 2, 3, 4, 5].map((item) => (
                    <Skeleton key={item} className="h-14 w-full" />
                  ))}
                </div>
              ) : !report ? (
                <EmptyState
                  title="Holder data unavailable"
                  description="No holder distribution data is currently available for this token."
/>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <InfoBox
                      label="Total holders"
                      value={report.totalHolders.toLocaleString()}
                    />
                    <InfoBox
                      label="Top holder"
                      value={
                        report.topHolders[0]
                          ? `${report.topHolders[0].pct.toFixed(2)}%`
                          : "—"
                      }
                    />
                    <InfoBox
                      label="Top 5"
                      value={
                        report.topHolders.length
                          ? `${report.topHolders
                              .slice(0, 5)
                              .reduce((sum, holder) => sum + holder.pct, 0)
                              .toFixed(2)}%`
                          : "—"
                      }
                    />
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-bb-border bg-bb-surface">
                    <div className="grid grid-cols-[52px_minmax(0,1fr)_100px] border-b border-bb-border px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                      <span>#</span>
                      <span>Wallet</span>
                      <span className="text-right">Share</span>
                    </div>

                    {report.topHolders.map((holder, index) => (
                      <button
                        key={holder.address}
                        onClick={() => setSelectedWallet(holder.owner)}
                        className="w-full grid grid-cols-[52px_minmax(0,1fr)_100px] items-center border-b border-bb-border px-4 py-3.5 transition last:border-b-0 hover:bg-bb-raised active:bg-bb-raised text-left"
                      >
                        <span className="text-xs font-bold text-zinc-500">
                          {String(index + 1).padStart(2, "0")}
                        </span>

                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm text-zinc-300">
                            {shortAddress(holder.owner)}
                          </span>

                          {holder.insider && (
                            <span className="shrink-0 rounded border border-bb-down/20 bg-bb-down/10 px-1.5 py-0.5 text-[11px] font-bold uppercase text-bb-down">
                              Insider
                            </span>
                          )}
                        </span>

                        <span className="text-right text-sm font-semibold tabular-nums text-zinc-200">
                          {holder.pct.toFixed(2)}%
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Security */}
          {activeTab === "Risk" && (
            <RiskTab report={report} reportLoading={reportLoading} />
          )}

          {/* Details */}
          {activeTab === "Detail" && (
            <section className="max-w-5xl">
              <SectionTitle title="Token details" />

              <div className="overflow-hidden rounded-2xl border border-bb-border bg-bb-surface">
                <DetailRow label="Name" value={name} />
                <DetailRow label="Symbol" value={`$${symbol}`} />
                <DetailRow label="Decimals" value={String(decimals)} />
                <DetailRow label="Mint" value={mint} copyable onCopy={copyMint} />
                <DetailRow
                  label="Pool"
                  value={poolAddress || "—"}
                  copyable={Boolean(poolAddress)}
                  onCopy={() => {
                    if (poolAddress) {
                      navigator.clipboard.writeText(poolAddress);
                    }
                  }}
                />
                <DetailRow
                  label="Price"
                  value={formatPrice(price)}
                />
                <DetailRow
                  label="Market cap"
                  value={formatCompact(mcapUsd)}
                />
                <DetailRow
                  label="Fully diluted valuation"
                  value={formatCompact(details?.fdvUsd)}
                />
                <DetailRow
                  label="Liquidity"
                  value={formatCompact(liqUsd)}
                />
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Persistent trading actions */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-bb-border bg-bb-bg/95 p-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] backdrop-blur-xl sm:p-3">
        <div className="mx-auto grid max-w-[1500px] grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => openTrade("BUY")}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-bb-up text-base font-bold text-black transition-all duration-150 active:scale-[0.97]"
          >
            <Zap className="h-4 w-4 fill-current" />
            Buy {symbol}
          </button>

          <button
            type="button"
            onClick={() => openTrade("SELL")}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-bb-down text-base font-bold text-black transition-all duration-150 active:scale-[0.97]"
          >
            <TrendingDown className="h-4 w-4" />
            Sell {symbol}
          </button>
        </div>
      </div>

      <TokenTradeSheet
        isOpen={tradeSheetOpen}
        onClose={() => setTradeSheetOpen(false)}
        token={token}
        initialMode={tradeMode}
      />

      <SetAlertModal
        isOpen={alertOpen}
        onClose={() => setAlertOpen(false)}
        mint={mint}
        poolAddress={poolAddress}
        symbol={symbol}
        currentPrice={price}
      />

      {selectedWallet && mint && (
        <WalletTokenStatsModal
          wallet={selectedWallet}
          mint={mint}
          onClose={() => setSelectedWallet(null)}
        />
      )}
    </div>
  );
}

function TradeTable({
  trades,
  onSelectTrader,
}: {
  trades: Array<{
    id: string;
    kind: string;
    timestamp: string | number;
    priceUsd: number | null;
    toAmount?: number | null;
    fromAmount?: number | null;
    volumeUsd: number | null;
    traderAddress?: string | null;
    txHash?: string | null;
  }>;
  onSelectTrader: (address: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-bb-border bg-bb-surface">
      <div className="grid grid-cols-[64px_minmax(0,1fr)_minmax(0,1fr)_90px_80px] gap-2 border-b border-bb-border px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        <span>Time</span>
        <span className="text-right">Price</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Vol</span>
        <span className="text-right">User</span>
      </div>

      <div>
        {trades.map((trade) => {
          const isBuy = trade.kind === "buy";

          const amount = isBuy ? trade.toAmount : trade.fromAmount;

          const content = (
            <>
              <span className="text-zinc-500 truncate">
                {new Date(trade.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>

              <span
                className={`text-right font-semibold tabular-nums ${
                  isBuy ? "text-bb-up" : "text-bb-down"
                }`}
              >
                {formatPrice(trade.priceUsd)}
              </span>

              <span className="text-right text-zinc-300 tabular-nums truncate">
                {amount !== null && amount !== undefined
                  ? amount.toLocaleString(undefined, { maximumFractionDigits: 2 })
                  : "—"}
              </span>

              <span className="text-right text-zinc-300 tabular-nums">
                {trade.volumeUsd !== null
                  ? `$${trade.volumeUsd.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}`
                  : "—"}
              </span>

              <span className="truncate text-right text-zinc-500">
                {shortAddress(trade.traderAddress)}
              </span>
            </>
          );

          if (!trade.traderAddress) {
            return (
              <div
                key={trade.id}
                className="grid grid-cols-[64px_minmax(0,1fr)_minmax(0,1fr)_90px_80px] gap-2 border-b border-bb-border px-4 py-3.5 text-xs last:border-b-0"
              >
                {content}
              </div>
            );
          }

          return (
            <button
              key={trade.id}
              onClick={() => onSelectTrader(trade.traderAddress!)}
              className="w-full grid grid-cols-[64px_minmax(0,1fr)_minmax(0,1fr)_90px_80px] gap-2 border-b border-bb-border px-4 py-3.5 text-xs transition hover:bg-bb-raised/30 last:border-b-0 text-left"
            >
              {content}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-bb-border bg-bb-surface p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-bold tabular-nums text-zinc-100">
        {value}
      </p>
    </div>
  );
}

function DetailRow({
  label,
  value,
  copyable = false,
  onCopy,
}: {
  label: string;
  value: string;
  copyable?: boolean;
  onCopy?: () => void;
}) {
  return (
    <div className="flex min-h-14 flex-col justify-center gap-1 border-b border-bb-border px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <span className="text-[11px] uppercase tracking-wider text-zinc-500">
        {label}
      </span>

      <div className="flex min-w-0 items-center gap-2 sm:max-w-[70%]">
        <span className="truncate text-xs text-zinc-300">{value}</span>

        {copyable && onCopy && (
          <button
            type="button"
            onClick={onCopy}
            className="shrink-0 rounded-md p-1 text-zinc-500 transition hover:bg-bb-raised hover:text-white"
            aria-label={`Copy ${label}`}
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function TokenDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bb-bg" aria-label="Loading token" />
      }
    >
      <TokenDetailInner />
    </Suspense>
  );
}
