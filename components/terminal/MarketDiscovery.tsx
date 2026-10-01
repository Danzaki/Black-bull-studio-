"use client";

import { useState, useMemo } from "react";
import { Star, RefreshCw, ChevronDown, X, Rocket, TrendingUp, TrendingDown, Filter } from "lucide-react";
import { useTrendingTokens, type TokenCategory, type TrendingToken } from "@/hooks/useTrendingTokens";
import { usePumpTokens, type PumpCategory, type PumpToken } from "@/hooks/usePumpTokens";
import { useWatchlist } from "@/hooks/useWatchlist";
import type { TokenInfo } from "@/types/terminal";

function formatCompact(num: number | null): string {
  if (num === null) return "--";
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toFixed(2)}`;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-zinc-900/80 ${className}`} />;
}

interface MarketDiscoveryProps {
  onSelectToken?: (token: TokenInfo) => void;
}

type MainTab = "favorite" | "pump" | "market";
type SortField = "hot" | "marketcap" | "volume" | "holders" | "txs" | "age";
type TrenchWindow = "1m" | "5m" | "15m" | "1h" | "24h";

const PUMP_CATEGORIES: { id: PumpCategory; label: string }[] = [
  { id: "new", label: "New" },
  { id: "soon", label: "Soon" },
  { id: "graduated", label: "Graduated" },
];

const SORT_OPTIONS: { id: SortField; label: string; available: boolean }[] = [
  { id: "hot", label: "Hot (Recommended)", available: true },
  { id: "marketcap", label: "Market Cap", available: true },
  { id: "volume", label: "Volume", available: true },
  { id: "holders", label: "Holders", available: false },
  { id: "txs", label: "TXs", available: false },
  { id: "age", label: "Age", available: false },
];

const TRENCH_WINDOWS: TrenchWindow[] = ["1m", "5m", "15m", "1h", "24h"];

function trenchToKey(w: TrenchWindow): "m5" | "m15" | "h1" | "h24" {
  if (w === "1m" || w === "5m") return "m5";
  if (w === "15m") return "m15";
  if (w === "1h") return "h1";
  return "h24";
}

function StarToggle({ favorited, onClick }: { favorited: boolean; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button onClick={onClick} className="p-1.5 -m-1.5 shrink-0">
      <Star className={`h-4 w-4 ${favorited ? "fill-amber-400 text-amber-400" : "text-zinc-700"}`} />
    </button>
  );
}

export default function MarketDiscovery({ onSelectToken }: MarketDiscoveryProps) {
  const [mainTab, setMainTab] = useState<MainTab>("market");
  const [pumpCategory, setPumpCategory] = useState<PumpCategory>("new");
  const [sortField, setSortField] = useState<SortField>("volume");
  const [trenchWindow, setTrenchWindow] = useState<TrenchWindow>("1h");
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [trenchSheetOpen, setTrenchSheetOpen] = useState(false);

  // Map sort field to underlying category the hook understands
  const trendingCategory: TokenCategory = sortField === "volume" ? "hot" : sortField === "marketcap" ? "hot" : "hot";
  const { tokens, loading, error, refresh } = useTrendingTokens(trendingCategory);
  const { tokens: pumpTokens, loading: pumpLoading, error: pumpError, refresh: refreshPump } = usePumpTokens(pumpCategory);
  const { watchlist, isFavorited, toggleFavorite } = useWatchlist();

  const sortedTokens = useMemo(() => {
    const copy = [...tokens];
    if (sortField === "marketcap") copy.sort((a, b) => (b.marketCapUsd ?? -Infinity) - (a.marketCapUsd ?? -Infinity));
    if (sortField === "volume") copy.sort((a, b) => (b.volume24h ?? -Infinity) - (a.volume24h ?? -Infinity));
    return copy;
  }, [tokens, sortField]);

  function handleClickTrending(token: TrendingToken) {
    if (!onSelectToken || !token.mint) return;
    onSelectToken({
      symbol: token.symbol,
      name: token.name,
      mint: token.mint,
      decimals: token.decimals,
      poolAddress: token.poolAddress,
      price: token.priceUsd ?? undefined,
      change24h: token.priceChange24h ?? undefined,
      volume24h: token.volume24h ?? undefined,
      liquidity: token.liquidityUsd ?? undefined,
    });
  }

  function handleClickPump(token: PumpToken) {
    if (!onSelectToken || !token.mint) return;
    onSelectToken({ symbol: token.symbol, name: token.name, mint: token.mint, decimals: 6, price: token.priceUsd ?? undefined });
  }

  function handleClickFavorite(fav: ReturnType<typeof useWatchlist>["watchlist"][number]) {
    if (!onSelectToken) return;
    onSelectToken({ symbol: fav.symbol, name: fav.name, mint: fav.mint, decimals: fav.decimals, poolAddress: fav.poolAddress });
  }

  function toggleStarTrending(e: React.MouseEvent, token: TrendingToken) {
    e.stopPropagation();
    if (!token.mint) return;
    toggleFavorite({ mint: token.mint, symbol: token.symbol, name: token.name, imageUrl: token.imageUrl, poolAddress: token.poolAddress, decimals: token.decimals });
  }

  function toggleStarPump(e: React.MouseEvent, token: PumpToken) {
    e.stopPropagation();
    if (!token.mint) return;
    toggleFavorite({ mint: token.mint, symbol: token.symbol, name: token.name, imageUrl: token.imageUrl, decimals: 6 });
  }

  const activeSortLabel = SORT_OPTIONS.find((s) => s.id === sortField)?.label ?? "Hot";

  return (
    <div className="space-y-3.5 font-mono">
      {/* Main tabs */}
      <div className="flex items-center gap-1.5 border-b border-zinc-900 pb-3">
        {([
          { id: "favorite" as MainTab, label: "Favorite" },
          { id: "pump" as MainTab, label: "Pump" },
          { id: "market" as MainTab, label: "Market" },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setMainTab(tab.id)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              mainTab === tab.id ? "bg-white text-black" : "bg-zinc-900/60 text-zinc-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* MARKET TAB */}
      {mainTab === "market" && (
        <>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTrenchSheetOpen(true)}
              className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs font-bold text-zinc-300"
            >
              Trenches: {trenchWindow} <ChevronDown className="h-3 w-3 text-zinc-600" />
            </button>
            <button
              onClick={() => setSortSheetOpen(true)}
              className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs font-bold text-zinc-300"
            >
              {activeSortLabel.split(" ")[0]} <ChevronDown className="h-3 w-3 text-zinc-600" />
            </button>
            <button className="ml-auto p-2 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-500">
              <Filter className="h-3.5 w-3.5" />
            </button>
            <button onClick={refresh} className="p-2 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-500">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {error ? (
            <div className="py-6 text-center text-sm text-rose-400">{error}</div>
          ) : loading && sortedTokens.length === 0 ? (
            <div className="space-y-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : sortedTokens.length === 0 ? (
            <div className="py-6 text-center text-sm text-zinc-500">No tokens found.</div>
          ) : (
            <div className="divide-y divide-zinc-900">
              {sortedTokens.map((token) => {
                const windowKey = trenchToKey(trenchWindow);
                const windowChange = token.priceChangeWindows?.[windowKey] ?? token.priceChange24h;
                const isUp = (windowChange ?? 0) >= 0;
                return (
                  <div
                    key={token.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleClickTrending(token)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleClickTrending(token); }}
                    className={`w-full flex items-center justify-between py-3.5 hover:bg-zinc-950/60 transition-colors cursor-pointer ${!token.mint ? "opacity-50 pointer-events-none" : ""}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <StarToggle favorited={isFavorited(token.mint || "")} onClick={(e) => toggleStarTrending(e, token)} />
                      {token.imageUrl ? (
                        <img src={token.imageUrl} alt={token.symbol} className="h-9 w-9 rounded-full object-cover shrink-0 ring-1 ring-white/10" />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-orange-400 text-xs font-black">
                          {token.symbol[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-white text-sm truncate">{token.name}</div>
                        <div className="text-xs text-zinc-500 mt-0.5">
                          Vol {formatCompact(token.volume24h)} · Liq {formatCompact(token.liquidityUsd)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <div className="text-white font-bold text-sm tabular-nums">
                        {token.priceUsd !== null ? `$${token.priceUsd.toFixed(6)}` : "--"}
                      </div>
                      <div className={`inline-flex items-center gap-0.5 mt-1 text-xs font-bold px-1.5 py-0.5 rounded-md ${isUp ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
                        {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {windowChange !== null ? `${windowChange.toFixed(2)}%` : "--"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* PUMP TAB */}
      {mainTab === "pump" && (
        <>
          <div className="flex items-center gap-1.5">
            {PUMP_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setPumpCategory(cat.id)}
                className={`flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  pumpCategory === cat.id ? "bg-emerald-500 text-black" : "bg-zinc-900/60 text-zinc-400 hover:text-white"
                }`}
              >
                <Rocket className="h-3 w-3" /> {cat.label}
              </button>
            ))}
            <button onClick={refreshPump} className="ml-auto p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900">
              <RefreshCw className={`h-3.5 w-3.5 ${pumpLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {pumpError ? (
            <div className="py-6 text-center text-sm text-rose-400">{pumpError}</div>
          ) : pumpLoading && pumpTokens.length === 0 ? (
            <div className="space-y-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : pumpTokens.length === 0 ? (
            <div className="py-6 text-center text-sm text-zinc-500">No tokens found.</div>
          ) : (
            <div className="divide-y divide-zinc-900">
              {pumpTokens.map((token) => (
                <div
                  key={token.mint}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleClickPump(token)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleClickPump(token); }}
                  className="w-full py-3.5 hover:bg-zinc-950/60 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <StarToggle favorited={isFavorited(token.mint)} onClick={(e) => toggleStarPump(e, token)} />
                      {token.imageUrl ? (
                        <img src={token.imageUrl} alt={token.symbol} className="h-9 w-9 rounded-full object-cover shrink-0 ring-1 ring-white/10" />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-orange-400 text-xs font-black">
                          {token.symbol[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-white text-sm truncate">{token.name}</div>
                        <div className="text-xs text-zinc-500 mt-0.5">MCap {formatCompact(token.marketCapUsd)} · Liq {formatCompact(token.liquidityUsd)}</div>
                      </div>
                    </div>
                    <div className="text-white font-bold text-sm tabular-nums shrink-0 ml-2">
                      {token.priceUsd !== null ? `$${token.priceUsd.toFixed(8)}` : "--"}
                    </div>
                  </div>
                  {pumpCategory === "soon" && token.curvePercentage !== null && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-zinc-900 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-500 to-emerald-400" style={{ width: `${Math.min(token.curvePercentage, 100)}%` }} />
                      </div>
                      <span className="text-[10px] font-bold text-emerald-400 shrink-0">{token.curvePercentage.toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* FAVORITE TAB */}
      {mainTab === "favorite" && (
        <div className="divide-y divide-zinc-900">
          {watchlist.length === 0 ? (
            <div className="py-10 text-center text-sm text-zinc-500">No favorites yet. Tap the star on any token to add it here.</div>
          ) : (
            watchlist.map((fav) => (
              <div
                key={fav.mint}
                role="button"
                tabIndex={0}
                onClick={() => handleClickFavorite(fav)}
                onKeyDown={(e) => { if (e.key === "Enter") handleClickFavorite(fav); }}
                className="w-full flex items-center gap-2.5 py-3.5 hover:bg-zinc-950/60 transition-colors cursor-pointer"
              >
                <Star className="h-4 w-4 fill-amber-400 text-amber-400 shrink-0" />
                {fav.imageUrl ? (
                  <img src={fav.imageUrl} alt={fav.symbol} className="h-9 w-9 rounded-full object-cover shrink-0 ring-1 ring-white/10" />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-orange-400 text-xs font-black">
                    {fav.symbol[0]?.toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-bold text-white text-sm truncate">{fav.name}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{fav.symbol}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Trenches bottom sheet */}
      {trenchSheetOpen && (
        <div className="fixed inset-0 z-[70] flex items-end" onClick={() => setTrenchSheetOpen(false)}>
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative w-full rounded-t-2xl border-t border-zinc-800 bg-[#0a0a0a] p-4 space-y-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-white">Trenches Window</h3>
              <button onClick={() => setTrenchSheetOpen(false)} className="p-1 text-zinc-500 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            {TRENCH_WINDOWS.map((w) => (
              <button
                key={w}
                onClick={() => { setTrenchWindow(w); setTrenchSheetOpen(false); }}
                className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-bold transition ${trenchWindow === w ? "border-white text-white" : "border-zinc-800 text-zinc-400"}`}
              >
                {w}
                <span className={`h-4 w-4 rounded-full border-2 ${trenchWindow === w ? "border-white bg-white" : "border-zinc-700"}`} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sort bottom sheet */}
      {sortSheetOpen && (
        <div className="fixed inset-0 z-[70] flex items-end" onClick={() => setSortSheetOpen(false)}>
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative w-full rounded-t-2xl border-t border-zinc-800 bg-[#0a0a0a] p-4 space-y-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-white">Sort by</h3>
              <button onClick={() => setSortSheetOpen(false)} className="p-1 text-zinc-500 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                disabled={!opt.available}
                onClick={() => { if (opt.available) { setSortField(opt.id); setSortSheetOpen(false); } }}
                className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-bold transition ${
                  !opt.available ? "border-zinc-900 text-zinc-700 opacity-50" : sortField === opt.id ? "border-white text-white" : "border-zinc-800 text-zinc-400"
                }`}
              >
                {opt.label}
                {opt.available ? (
                  <span className={`h-4 w-4 rounded-full border-2 ${sortField === opt.id ? "border-white bg-white" : "border-zinc-700"}`} />
                ) : (
                  <span className="text-[9px] uppercase text-zinc-700">Soon</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
