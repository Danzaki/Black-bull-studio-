"use client";

import { Suspense, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Check,
  Copy,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";

import SolanaTradingChart from "@/components/terminal/SolanaTradingChart";
import TokenTradeSheet from "@/components/terminal/TokenTradeSheet";
import SetAlertModal from "@/components/terminal/SetAlertModal";

import { usePoolDetails } from "@/hooks/usePoolDetails";
import { useTokenTrades } from "@/hooks/useTokenTrades";
import { useSolanaWebSocket } from "@/hooks/useSolanaWebSocket";
import { useRugCheck } from "@/hooks/useRugCheck";
import { useTokenOHLCV } from "@/hooks/useTokenOHLCV";

import type { Timeframe, TokenInfo } from "@/types/terminal";

const TIMEFRAMES: Timeframe[] = ["1m", "5m", "15m", "1h", "4h", "1d"];

const TABS = [
  "Overview",
  "Activity",
  "Holders",
  "Security",
  "Details",
] as const;

type Tab = (typeof TABS)[number];

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

  return `$${value.toPrecision(6)}`;
}

function shortAddress(value: string | null | undefined): string {
  if (!value) return "—";
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}…${value.slice(-6)}`;
}

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-zinc-900/80 ${className}`}
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
    <div className="min-w-0 border-l border-zinc-800/70 pl-4 first:border-l-0 first:pl-0">
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-600">
        {label}
      </p>
      <p
        className={`mt-1.5 truncate text-sm font-semibold tabular-nums ${
          positive
            ? "text-emerald-400"
            : negative
              ? "text-rose-400"
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
    <div className="rounded-2xl border border-zinc-900 bg-[#080808] px-5 py-10 text-center">
      <p className="text-sm font-medium text-zinc-300">{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-zinc-600">
        {description}
      </p>
    </div>
  );
}

function TokenDetailInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const mint = typeof params?.mint === "string" ? params.mint : "";
  const poolAddress = searchParams.get("pool");
  const symbol = searchParams.get("symbol") || "TOKEN";
  const name = searchParams.get("name") || symbol;
  const decimals = Number.parseInt(searchParams.get("decimals") || "9", 10);

  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [timeframe, setTimeframe] = useState<Timeframe>("1h");
  const [tradeSheetOpen, setTradeSheetOpen] = useState(false);
  const [tradeMode, setTradeMode] = useState<"BUY" | "SELL">("BUY");
  const [alertOpen, setAlertOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { latestLog } = useSolanaWebSocket(
    "wss://api.mainnet-beta.solana.com",
    poolAddress
  );

  const { details, loading: detailsLoading } = usePoolDetails(
    poolAddress,
    latestLog?.signature ? Date.now() : 0
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

  const price = details?.priceUsd ?? null;
  const change24h = details?.priceChange24h ?? null;
  const isUp = change24h !== null && change24h >= 0;

  function openTrade(mode: "BUY" | "SELL") {
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
    <div className="min-h-screen bg-[#050505] pb-24 text-zinc-100">
      {/* Top terminal bar */}
      <header className="sticky top-0 z-40 border-b border-zinc-900/90 bg-[#050505]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1500px] items-center gap-3 px-3 sm:px-5">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-900 hover:text-white"
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
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-800 bg-zinc-950 text-[10px] font-black text-zinc-300">
                {symbol.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-bold text-white">
                  {symbol}
                </span>
                <span className="hidden text-[10px] text-zinc-600 sm:inline">
                  {name}
                </span>
              </div>

              <button
                type="button"
                onClick={copyMint}
                className="flex max-w-[190px] items-center gap-1 text-[9px] text-zinc-600 transition hover:text-zinc-300"
              >
                <span className="truncate">{shortAddress(mint)}</span>
                {copied ? (
                  <Check className="h-3 w-3 text-emerald-400" />
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
              className="hidden h-8 items-center gap-1.5 rounded-lg border border-zinc-900 px-2.5 text-[10px] font-medium text-zinc-500 transition hover:border-zinc-700 hover:text-white sm:flex"
            >
              Solscan
              <ExternalLink className="h-3 w-3" />
            </a>

            <button
              type="button"
              onClick={() => setAlertOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-900 text-zinc-500 transition hover:border-zinc-700 hover:text-emerald-400"
              aria-label="Set price alert"
            >
              <Bell className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px]">
        {/* Token hero */}
        <section className="border-b border-zinc-900/80 px-3 py-5 sm:px-5 sm:py-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-400">
                  Solana
                </span>
                {report?.scoreNormalised !== undefined && (
                  <span
                    className={`rounded-md border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] ${
                      report.scoreNormalised < 30
                        ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
                        : report.scoreNormalised < 60
                          ? "border-amber-500/20 bg-amber-500/5 text-amber-400"
                          : "border-rose-500/20 bg-rose-500/5 text-rose-400"
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
                  <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                    {formatPrice(price)}
                  </h1>
                )}

                {!detailsLoading && change24h !== null && (
                  <span
                    className={`mb-1 flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold ${
                      isUp
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-rose-500/10 text-rose-400"
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

            <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4 lg:min-w-[610px] lg:grid-cols-4">
              <Metric
                label="Market cap"
                value={formatCompact(details?.marketCapUsd)}
              />
              <Metric
                label="Liquidity"
                value={formatCompact(details?.liquidityUsd)}
              />
              <Metric
                label="24h volume"
                value={formatCompact(details?.volume24h)}
              />
              <Metric
                label="Buys / sells"
                value={
                  <>
                    <span className="text-emerald-400">
                      {details?.buys24h ?? "—"}
                    </span>
                    <span className="mx-1 text-zinc-700">/</span>
                    <span className="text-rose-400">
                      {details?.sells24h ?? "—"}
                    </span>
                  </>
                }
              />
            </div>
          </div>
        </section>

        {/* Navigation */}
        <nav className="border-b border-zinc-900/80 px-3 sm:px-5">
          <div className="flex gap-5 overflow-x-auto no-scrollbar">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`relative whitespace-nowrap py-3.5 text-[11px] font-semibold transition ${
                  activeTab === tab
                    ? "text-white"
                    : "text-zinc-600 hover:text-zinc-300"
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <span className="absolute inset-x-0 bottom-0 h-px bg-emerald-400" />
                )}
              </button>
            ))}
          </div>
        </nav>

        <div className="px-3 py-5 sm:px-5">
          {/* Overview */}
          {activeTab === "Overview" && (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
              <section className="min-w-0">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-1 rounded-lg border border-zinc-900 bg-[#080808] p-1">
                    {TIMEFRAMES.map((tf) => (
                      <button
                        key={tf}
                        type="button"
                        onClick={() => setTimeframe(tf)}
                        className={`rounded-md px-2.5 py-1.5 text-[10px] font-semibold transition ${
                          timeframe === tf
                            ? "bg-zinc-800 text-white"
                            : "text-zinc-600 hover:text-zinc-300"
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>

                  <span className="text-[9px] uppercase tracking-[0.15em] text-zinc-700">
                    {poolAddress ? `Pool ${shortAddress(poolAddress)}` : "No pool"}
                  </span>
                </div>

                <div className="overflow-hidden rounded-2xl border border-zinc-900 bg-[#070707]">
                  <SolanaTradingChart
                    symbol={symbol}
                    candles={candles}
                    loading={chartLoading}
                  />
                </div>
              </section>

              <aside className="space-y-5">
                <section>
                  <SectionTitle title="Market" />
                  <div className="divide-y divide-zinc-900 rounded-2xl border border-zinc-900 bg-[#080808]">
                    <div className="flex items-center justify-between px-4 py-3.5">
                      <span className="text-xs text-zinc-600">Market cap</span>
                      <span className="text-xs font-semibold text-zinc-200">
                        {formatCompact(details?.marketCapUsd)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3.5">
                      <span className="text-xs text-zinc-600">FDV</span>
                      <span className="text-xs font-semibold text-zinc-200">
                        {formatCompact(details?.fdvUsd)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3.5">
                      <span className="text-xs text-zinc-600">Liquidity</span>
                      <span className="text-xs font-semibold text-zinc-200">
                        {formatCompact(details?.liquidityUsd)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3.5">
                      <span className="text-xs text-zinc-600">24h volume</span>
                      <span className="text-xs font-semibold text-zinc-200">
                        {formatCompact(details?.volume24h)}
                      </span>
                    </div>
                  </div>
                </section>

                <section>
                  <SectionTitle
                    title="Flow"
                    action={
                      <span className="text-[9px] uppercase tracking-widest text-zinc-700">
                        24H
                      </span>
                    }
                  />
                  <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-zinc-900 bg-[#080808]">
                    <div className="border-r border-zinc-900 p-4">
                      <p className="text-[9px] uppercase tracking-widest text-zinc-600">
                        Buys
                      </p>
                      <p className="mt-2 text-xl font-bold text-emerald-400">
                        {details?.buys24h ?? "—"}
                      </p>
                    </div>
                    <div className="p-4">
                      <p className="text-[9px] uppercase tracking-widest text-zinc-600">
                        Sells
                      </p>
                      <p className="mt-2 text-xl font-bold text-rose-400">
                        {details?.sells24h ?? "—"}
                      </p>
                    </div>
                  </div>
                </section>
              </aside>

              <section className="min-w-0 lg:col-span-2">
                <SectionTitle
                  title="Recent activity"
                  action={
                    <button
                      type="button"
                      onClick={() => setActiveTab("Activity")}
                      className="text-[10px] font-semibold text-zinc-600 hover:text-white"
                    >
                      View all
                    </button>
                  }
                />

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
                  <TradeTable trades={trades.slice(0, 8)} />
                )}
              </section>
            </div>
          )}

          {/* Activity */}
          {activeTab === "Activity" && (
            <section>
              <SectionTitle
                title="Trade activity"
                action={
                  <span className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-widest text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Live data
                  </span>
                }
              />

              {tradesLoading && trades.length === 0 ? (
                <div className="space-y-1.5">
                  {[1, 2, 3, 4, 5, 6].map((item) => (
                    <Skeleton key={item} className="h-12 w-full" />
                  ))}
                </div>
              ) : trades.length === 0 ? (
                <EmptyState
                  title="No trade activity"
                  description="No recent on-chain trade activity was returned for this pool."
                />
              ) : (
                <TradeTable trades={trades} />
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

                  <div className="overflow-hidden rounded-2xl border border-zinc-900 bg-[#080808]">
                    <div className="grid grid-cols-[52px_minmax(0,1fr)_100px] border-b border-zinc-900 px-4 py-3 text-[9px] font-semibold uppercase tracking-widest text-zinc-600">
                      <span>#</span>
                      <span>Wallet</span>
                      <span className="text-right">Share</span>
                    </div>

                    {report.topHolders.map((holder, index) => (
                      <a
                        key={holder.address}
                        href={`https://solscan.io/account/${holder.owner}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="grid grid-cols-[52px_minmax(0,1fr)_100px] items-center border-b border-zinc-900/70 px-4 py-3.5 transition last:border-b-0 hover:bg-zinc-900/30"
                      >
                        <span className="text-xs font-bold text-zinc-600">
                          {String(index + 1).padStart(2, "0")}
                        </span>

                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-xs text-zinc-300">
                            {shortAddress(holder.owner)}
                          </span>

                          {holder.insider && (
                            <span className="shrink-0 rounded border border-rose-500/20 bg-rose-500/5 px-1.5 py-0.5 text-[8px] font-bold uppercase text-rose-400">
                              Insider
                            </span>
                          )}
                        </span>

                        <span className="text-right text-xs font-semibold tabular-nums text-zinc-200">
                          {holder.pct.toFixed(2)}%
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Security */}
          {activeTab === "Security" && (
            <section className="max-w-5xl">
              <SectionTitle title="Security analysis" />

              {reportLoading && !report ? (
                <div className="space-y-3">
                  <Skeleton className="h-36 w-full" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                </div>
              ) : !report ? (
                <EmptyState
                  title="Security data unavailable"
                  description="The security provider did not return a report for this token."
                />
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-zinc-900 bg-[#080808] p-5 sm:p-6">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                          RugCheck score
                        </p>
                        <p
                          className={`mt-1 text-4xl font-black tabular-nums ${
                            report.scoreNormalised < 30
                              ? "text-emerald-400"
                              : report.scoreNormalised < 60
                                ? "text-amber-400"
                                : "text-rose-400"
                          }`}
                        >
                          {report.scoreNormalised}
                          <span className="ml-1 text-base text-zinc-700">
                            /100
                          </span>
                        </p>
                      </div>

                      <div className="w-full max-w-sm">
                        <div className="mb-2 flex justify-between text-[9px] uppercase tracking-widest text-zinc-600">
                          <span>Risk</span>
                          <span>
                            {report.scoreNormalised < 30
                              ? "Lower"
                              : report.scoreNormalised < 60
                                ? "Moderate"
                                : "Higher"}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-900">
                          <div
                            className={`h-full rounded-full ${
                              report.scoreNormalised < 30
                                ? "bg-emerald-400"
                                : report.scoreNormalised < 60
                                  ? "bg-amber-400"
                                  : "bg-rose-400"
                            }`}
                            style={{
                              width: `${Math.min(
                                Math.max(report.scoreNormalised, 0),
                                100,
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <SecurityCheck
                      label="Mint authority"
                      safe={report.mintAuthorityRevoked}
                    />
                    <SecurityCheck
                      label="Freeze authority"
                      safe={report.freezeAuthorityRevoked}
                    />
                  </div>

                  {report.risks.length > 0 && (
                    <div>
                      <SectionTitle title="Flagged risks" />
                      <div className="space-y-2">
                        {report.risks.map((risk, index) => (
                          <div
                            key={`${risk.name}-${index}`}
                            className="rounded-xl border border-amber-500/15 bg-amber-500/[0.03] p-4"
                          >
                            <p className="text-xs font-semibold text-amber-400">
                              {risk.name}
                            </p>
                            <p className="mt-1.5 text-[11px] leading-5 text-zinc-500">
                              {risk.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Details */}
          {activeTab === "Details" && (
            <section className="max-w-5xl">
              <SectionTitle title="Token details" />

              <div className="overflow-hidden rounded-2xl border border-zinc-900 bg-[#080808]">
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
                  value={formatCompact(details?.marketCapUsd)}
                />
                <DetailRow
                  label="Fully diluted valuation"
                  value={formatCompact(details?.fdvUsd)}
                />
                <DetailRow
                  label="Liquidity"
                  value={formatCompact(details?.liquidityUsd)}
                />
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Persistent trading actions */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-900 bg-[#050505]/95 p-2.5 backdrop-blur-xl sm:p-3">
        <div className="mx-auto grid max-w-[1500px] grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => openTrade("BUY")}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-black text-black transition hover:bg-emerald-400 active:scale-[0.99]"
          >
            <Zap className="h-4 w-4 fill-current" />
            Buy {symbol}
          </button>

          <button
            type="button"
            onClick={() => openTrade("SELL")}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-rose-500 text-sm font-black text-black transition hover:bg-rose-400 active:scale-[0.99]"
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
    </div>
  );
}

function TradeTable({
  trades,
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
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-900 bg-[#080808]">
      <div className="grid grid-cols-[76px_minmax(90px,1fr)_100px_100px_110px] gap-3 border-b border-zinc-900 px-4 py-3 text-[9px] font-semibold uppercase tracking-widest text-zinc-600">
        <span>Side</span>
        <span>Time</span>
        <span className="text-right">Price</span>
        <span className="text-right">Volume</span>
        <span className="text-right">Trader</span>
      </div>

      <div>
        {trades.map((trade) => {
          const isBuy = trade.kind === "buy";

          const content = (
            <>
              <span
                className={`font-bold uppercase ${
                  isBuy ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {isBuy ? "Buy" : "Sell"}
              </span>

              <span className="text-zinc-500">
                {new Date(trade.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>

              <span
                className={`text-right font-semibold tabular-nums ${
                  isBuy ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {formatPrice(trade.priceUsd)}
              </span>

              <span className="text-right text-zinc-300 tabular-nums">
                {trade.volumeUsd !== null
                  ? `$${trade.volumeUsd.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}`
                  : "—"}
              </span>

              <span className="truncate text-right text-zinc-600">
                {shortAddress(trade.traderAddress)}
              </span>
            </>
          );

          if (!trade.txHash) {
            return (
              <div
                key={trade.id}
                className="grid grid-cols-[76px_minmax(90px,1fr)_100px_100px_110px] gap-3 border-b border-zinc-900/70 px-4 py-3.5 text-[11px] last:border-b-0"
              >
                {content}
              </div>
            );
          }

          return (
            <a
              key={trade.id}
              href={`https://solscan.io/tx/${trade.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="grid grid-cols-[76px_minmax(90px,1fr)_100px_100px_110px] gap-3 border-b border-zinc-900/70 px-4 py-3.5 text-[11px] transition hover:bg-zinc-900/30 last:border-b-0"
            >
              {content}
            </a>
          );
        })}
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-900 bg-[#080808] p-4">
      <p className="text-[9px] font-semibold uppercase tracking-widest text-zinc-600">
        {label}
      </p>
      <p className="mt-2 text-lg font-bold tabular-nums text-zinc-100">
        {value}
      </p>
    </div>
  );
}

function SecurityCheck({
  label,
  safe,
}: {
  label: string;
  safe: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-zinc-900 bg-[#080808] p-4">
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-widest text-zinc-600">
          {label}
        </p>
        <p
          className={`mt-1 text-sm font-semibold ${
            safe ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {safe ? "Revoked" : "Active"}
        </p>
      </div>
{safe ? (
        <ShieldCheck className="h-5 w-5 text-emerald-400" />
      ) : (
        <ShieldAlert className="h-5 w-5 text-rose-400" />
      )}
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
    <div className="flex min-h-14 flex-col justify-center gap-1 border-b border-zinc-900/70 px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <span className="text-[10px] uppercase tracking-widest text-zinc-600">
        {label}
      </span>

      <div className="flex min-w-0 items-center gap-2 sm:max-w-[70%]">
        <span className="truncate text-xs text-zinc-300">{value}</span>

        {copyable && onCopy && (
          <button
            type="button"
            onClick={onCopy}
            className="shrink-0 rounded-md p-1 text-zinc-600 transition hover:bg-zinc-900 hover:text-white"
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
        <div className="min-h-screen bg-[#050505]" aria-label="Loading token" />
      }
    >
      <TokenDetailInner />
    </Suspense>
  );
}
