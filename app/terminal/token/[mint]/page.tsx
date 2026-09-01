"use client";

import { useState, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, TrendingUp, TrendingDown, ShieldCheck, ShieldAlert, Zap, TrendingDown as SellIcon, Bell as BellIcon } from "lucide-react";
import SolanaTradingChart from "@/components/terminal/SolanaTradingChart";
import TokenTradeSheet from "@/components/terminal/TokenTradeSheet";
import { usePoolDetails } from "@/hooks/usePoolDetails";
import { useTokenTrades } from "@/hooks/useTokenTrades";
import { useRugCheck } from "@/hooks/useRugCheck";
import { useTokenOHLCV } from "@/hooks/useTokenOHLCV";
import SetAlertModal from "@/components/terminal/SetAlertModal";
import type { Timeframe, TokenInfo } from "@/types/terminal";

const TIMEFRAMES: Timeframe[] = ["1m", "5m", "15m", "1h", "4h", "1d"];
const TABS = ["Markets", "Holders", "Detail", "History", "Risk"] as const;

function formatCompact(num: number | null): string {
  if (num === null) return "--";
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(2)}`;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-zinc-900/80 ${className}`} />;
}

function MetricCard({ label, value, valueClassName }: { label: string; value: React.ReactNode; valueClassName?: string }) {
  return (
    <div className="rounded-2xl border border-zinc-900 bg-gradient-to-br from-zinc-950 to-black p-3.5 transition-colors hover:border-zinc-800">
      <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">{label}</p>
      <p className={`text-base font-bold mt-1 ${valueClassName ?? "text-white"}`}>{value}</p>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const styles =
    rank === 1
      ? "bg-amber-400/15 text-amber-400 border-amber-400/30"
      : rank === 2
      ? "bg-zinc-300/15 text-zinc-300 border-zinc-300/30"
      : rank === 3
      ? "bg-orange-600/15 text-orange-500 border-orange-600/30"
      : "bg-zinc-900 text-zinc-500 border-zinc-800";
  return (
    <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-black ${styles}`}>
      {rank}
    </span>
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
  const decimals = parseInt(searchParams.get("decimals") || "9", 10);

  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Markets");
  const [timeframe, setTimeframe] = useState<Timeframe>("1h");
  const [tradeSheetOpen, setTradeSheetOpen] = useState(false);
  const [tradeMode, setTradeMode] = useState<"BUY" | "SELL">("BUY");
  const [alertOpen, setAlertOpen] = useState(false);

  const { details, loading: detailsLoading } = usePoolDetails(poolAddress);
  const { candles, loading: chartLoading } = useTokenOHLCV(poolAddress, timeframe);
  const { trades, loading: tradesLoading } = useTokenTrades(poolAddress);
  const { report, loading: reportLoading } = useRugCheck(mint || null);

  const token: TokenInfo = { symbol, name, mint, decimals, poolAddress: poolAddress || undefined };

  const isUp = (details?.priceChange24h ?? 0) >= 0;

  function openTrade(mode: "BUY" | "SELL") {
    setTradeMode(mode);
    setTradeSheetOpen(true);
  }

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-mono pb-28">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-zinc-900/80 bg-gradient-to-b from-black/95 to-black/80 backdrop-blur-xl px-4 py-3.5">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => setAlertOpen(true)}
          className="p-1.5 rounded-xl text-zinc-400 hover:text-emerald-400 hover:bg-zinc-900 transition-colors shrink-0"
          title="Set price alert"
        >
          <BellIcon className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-bold text-white truncate tracking-tight">{name}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            {detailsLoading && !details ? (
              <Skeleton className="h-4 w-28" />
            ) : (
              <>
                <span className="text-base font-black text-white tabular-nums">
                  {details?.priceUsd !== null && details?.priceUsd !== undefined
                    ? `$${details.priceUsd.toFixed(6)}`
                    : "--"}
                </span>
                <span
                  className={`flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${
                    isUp ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
                  }`}
                >
                  {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {details?.priceChange24h !== null && details?.priceChange24h !== undefined
                    ? `${details.priceChange24h.toFixed(2)}%`
                    : "--"}
                </span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-zinc-900/80 px-4 py-2.5 text-xs">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition-all duration-200 ${
              activeTab === tab
                ? "bg-emerald-500 text-black shadow-[0_0_16px_-2px_rgba(16,185,129,0.5)]"
                : "text-zinc-500 hover:text-white hover:bg-zinc-900/60"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div key={activeTab} className="animate-[fadeIn_0.25s_ease-out]">
        {activeTab === "Markets" ? (
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-1.5">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all duration-200 ${
                    timeframe === tf
                      ? "bg-emerald-500 text-black"
                      : "bg-zinc-900/70 text-zinc-400 hover:bg-zinc-900"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-zinc-900 overflow-hidden shadow-2xl shadow-black/40">
              <SolanaTradingChart symbol={symbol} candles={candles} loading={chartLoading} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MetricCard label="Market Cap" value={formatCompact(details?.marketCapUsd ?? details?.fdvUsd ?? null)} />
              <MetricCard label="24h Volume" value={formatCompact(details?.volume24h ?? null)} />
              <MetricCard label="Liquidity" value={formatCompact(details?.liquidityUsd ?? null)} />
              <MetricCard
                label="24h Buys / Sells"
                value={
                  <>
                    <span className="text-emerald-400">{details?.buys24h ?? "--"}</span>
                    <span className="text-zinc-600"> / </span>
                    <span className="text-rose-400">{details?.sells24h ?? "--"}</span>
                  </>
                }
              />
            </div>
          </div>
        ) : activeTab === "History" ? (
          <div className="p-4">
            {tradesLoading && trades.length === 0 ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : trades.length === 0 ? (
              <p className="text-center text-xs text-zinc-500 py-10">No recent trades found.</p>
            ) : (
              <div className="space-y-1.5">
                <div className="grid grid-cols-5 gap-2 text-[9px] font-semibold text-zinc-500 uppercase tracking-wider px-2.5 pb-2 border-b border-zinc-900">
                  <span>Time</span>
                  <span className="text-right">Price</span>
                  <span className="text-right">Amount</span>
                  <span className="text-right">Volume($)</span>
                  <span className="text-right">Trader</span>
                </div>
                {trades.map((trade) => {
                  const isBuy = trade.kind === "buy";
                  return (
                    <a
                      key={trade.id}
                      href={trade.txHash ? `https://solscan.io/tx/${trade.txHash}` : undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`grid grid-cols-5 gap-2 items-center px-2.5 py-2.5 rounded-xl text-[11px] border-l-2 bg-zinc-950/80 hover:bg-zinc-900/60 transition-colors ${
                        isBuy ? "border-l-emerald-500/60" : "border-l-rose-500/60"
                      }`}
                    >
                      <span className="text-zinc-400">
                        {new Date(trade.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </span>
                      <span className={`text-right font-bold ${isBuy ? "text-emerald-400" : "text-rose-400"}`}>
                        {trade.priceUsd !== null ? trade.priceUsd.toFixed(6) : "--"}
                      </span>
                      <span className="text-right text-white">
                        {(isBuy ? trade.toAmount : trade.fromAmount)?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? "--"}
                      </span>
                      <span className="text-right text-zinc-300">
                        {trade.volumeUsd !== null ? trade.volumeUsd.toFixed(2) : "--"}
                      </span>
                      <span className="text-right text-zinc-500 truncate">
                        {trade.traderAddress ? `${trade.traderAddress.slice(0, 4)}...${trade.traderAddress.slice(-4)}` : "--"}
                      </span>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        ) : activeTab === "Risk" ? (
          <div className="p-4 space-y-4">
            {reportLoading && !report ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            ) : !report ? (
              <p className="text-center text-xs text-zinc-500 py-10">Security data unavailable for this token.</p>
            ) : (
              <>
                <div className="rounded-2xl border border-zinc-900 bg-gradient-to-b from-zinc-950 to-black p-5 text-center overflow-hidden relative">
                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Risk Score</p>
                  <p
                    className={`text-4xl font-black mt-1.5 ${
                      report.scoreNormalised < 30
                        ? "text-emerald-400"
                        : report.scoreNormalised < 60
                        ? "text-amber-400"
                        : "text-rose-400"
                    }`}
                  >
                    {report.scoreNormalised}<span className="text-lg text-zinc-600">/100</span>
                  </p>
                  <div className="mt-3 h-1.5 w-full rounded-full bg-zinc-900 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        report.scoreNormalised < 30 ? "bg-emerald-400" : report.scoreNormalised < 60 ? "bg-amber-400" : "bg-rose-400"
                      }`}
                      style={{ width: `${Math.min(report.scoreNormalised, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-zinc-600 mt-2">Lower is safer · via RugCheck.xyz</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-3.5 flex items-center gap-2.5">
                    {report.mintAuthorityRevoked ? (
                      <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
                    ) : (
                      <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0" />
                    )}
                    <div>
                      <p className="text-[10px] text-zinc-500">Mint Authority</p>
                      <p className={`text-xs font-bold ${report.mintAuthorityRevoked ? "text-emerald-400" : "text-rose-400"}`}>
                        {report.mintAuthorityRevoked ? "Revoked" : "Active"}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-3.5 flex items-center gap-2.5">
                    {report.freezeAuthorityRevoked ? (
                      <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
                    ) : (
                      <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0" />
                    )}
                    <div>
                      <p className="text-[10px] text-zinc-500">Freeze Authority</p>
                      <p className={`text-xs font-bold ${report.freezeAuthorityRevoked ? "text-emerald-400" : "text-rose-400"}`}>
                        {report.freezeAuthorityRevoked ? "Revoked" : "Active"}
                      </p>
                    </div>
                  </div>
                </div>

                {report.risks.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Flagged Risks</p>
                    {report.risks.map((risk, i) => (
                      <div key={i} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5">
                        <p className="text-xs font-bold text-amber-400">{risk.name}</p>
                        <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{risk.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ) : activeTab === "Holders" ? (
          <div className="p-4 space-y-3">
            {reportLoading && !report ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-11 w-full" />
                ))}
              </div>
            ) : !report ? (
              <p className="text-center text-xs text-zinc-500 py-10">Holder data unavailable for this token.</p>
            ) : (
              <>
                <div className="rounded-2xl border border-zinc-900 bg-gradient-to-br from-zinc-950 to-black p-4 text-center">
                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Total Holders</p>
                  <p className="text-2xl font-black text-white mt-1 tabular-nums">{report.totalHolders.toLocaleString()}</p>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-1">Top Holders</p>
                  {report.topHolders.map((holder, i) => (
                    <a
                      key={holder.address}
                      href={`https://solscan.io/account/${holder.owner}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-3 p-3 rounded-xl border border-zinc-900 bg-zinc-950 text-xs hover:border-zinc-700 hover:bg-zinc-900/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <RankBadge rank={i + 1} />
                        <span className="text-zinc-300 font-medium truncate">
                          {holder.owner.slice(0, 4)}...{holder.owner.slice(-4)}
                        </span>
                        {holder.insider && (
                          <span className="shrink-0 rounded-md bg-rose-500/15 text-rose-400 text-[9px] font-bold px-1.5 py-0.5">
                            INSIDER
                          </span>
                        )}
                      </div>
                      <span className="text-white font-bold shrink-0 tabular-nums">{holder.pct.toFixed(2)}%</span>
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="p-14 text-center text-sm text-zinc-500">
            {activeTab} — Coming soon.
          </div>
        )}
      </div>

      {/* Fixed Buy/Sell bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-900/80 bg-black/95 backdrop-blur-xl p-3 grid grid-cols-2 gap-3">
        <button
          onClick={() => openTrade("BUY")}
          className="flex items-center justify-center gap-1.5 py-3.5 rounded-xl font-black text-sm bg-emerald-500 text-black shadow-[0_0_20px_-4px_rgba(16,185,129,0.6)] hover:bg-emerald-400 active:scale-[0.98] transition-all"
        >
          <Zap className="h-4 w-4 fill-current" /> Buy
        </button>
        <button
          onClick={() => openTrade("SELL")}
          className="flex items-center justify-center gap-1.5 py-3.5 rounded-xl font-black text-sm bg-rose-500 text-black shadow-[0_0_20px_-4px_rgba(244,63,94,0.6)] hover:bg-rose-400 active:scale-[0.98] transition-all"
        >
          <SellIcon className="h-4 w-4" /> Sell
        </button>
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
        currentPrice={details?.priceUsd ?? null}
      />

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default function TokenDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050505]" />}>
      <TokenDetailInner />
    </Suspense>
  );
}
