"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import TerminalLayout from "@/components/layout/TerminalLayout";
import { MainTab, HomeSubTab, MarketSubTab, SmartMoneySubTab, SniperSubTab, WalletSubTab } from "@/types/navigation";

import SolanaTradingChart from "@/components/terminal/SolanaTradingChart";
import SolanaOrderBook from "@/components/terminal/SolanaOrderBook";
import SolanaSwapForm from "@/components/terminal/SolanaSwapForm";
import EmbeddedWalletCard from "@/components/terminal/EmbeddedWalletCard";
import SolanaTradeHistory from "@/components/terminal/SolanaTradeHistory";
import TokenHeaderMetrics from "@/components/terminal/TokenHeaderMetrics";
import TokenSecurityScanner from "@/components/terminal/TokenSecurityScanner";
import LivePositionsTracker from "@/components/terminal/LivePositionsTracker";
import NewPairsRadar from "@/components/terminal/NewPairsRadar";
import TrendingTokensWidget from "@/components/terminal/TrendingTokensWidget";
import MarketDiscovery from "@/components/terminal/MarketDiscovery";
import WalletSnapshotHeader from "@/components/terminal/WalletSnapshotHeader";
import WhaleTracker from "@/components/terminal/WhaleTracker";
import SmartMoneyLeaderboard from "@/components/terminal/SmartMoneyLeaderboard";
import SignalFeed from "@/components/terminal/SignalFeed";
import CopyTradingEngine from "@/components/terminal/CopyTradingEngine";
import MultiWalletManager from "@/components/terminal/MultiWalletManager";
import AutoSniperMEV from "@/components/terminal/AutoSniperMEV";
import TokenHolderVisualizer from "@/components/terminal/TokenHolderVisualizer";
import WatchlistManager from "@/components/terminal/WatchlistManager";
import PriorityFeeSettings from "@/components/terminal/PriorityFeeSettings";
import WebSocketLiveBadge from "@/components/terminal/WebSocketLiveBadge";

import { useSolanaPrice } from "@/hooks/useSolanaPrice";
import { useTokenOHLCV } from "@/hooks/useTokenOHLCV";
import { TokenInfo, Timeframe } from "@/types/terminal";

export default function TerminalPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<MainTab>("home");

  const [homeSub, setHomeSub] = useState<HomeSubTab>("overview");
  const [marketSub, setMarketSub] = useState<MarketSubTab>("chart_terminal");
  const [smartMoneySub, setSmartMoneySub] = useState<SmartMoneySubTab>("signals");
  const [sniperSub, setSniperSub] = useState<SniperSubTab>("auto_sniper");
  const [walletSub, setWalletSub] = useState<WalletSubTab>("main_wallet");

  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>("15m");
  const [tokenSelected, setTokenSelected] = useState(false);

  const { price, loading } = useSolanaPrice(selectedToken?.mint ?? "");
  const { candles, loading: chartLoading } = useTokenOHLCV(selectedToken?.poolAddress ?? null, timeframe);

  function handleSelectToken(token: TokenInfo) {
    setSelectedToken(token);
    setTokenSelected(true);
  }

  function handleSelectTokenAndGoToMarket(token: TokenInfo) {
    setSelectedToken(token);
    setTokenSelected(true);

    const query = new URLSearchParams({
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals.toString(),
      ...(token.poolAddress ? { pool: token.poolAddress } : {}),
    });

    router.push(`/terminal/token/${token.mint}?${query.toString()}`);
  }

  const renderSubTabs = () => {
    switch (activeTab) {
      case "home":
        return null;

      case "smartmoney":
        return (
          <div className="flex items-center gap-1 text-xs font-mono overflow-x-auto no-scrollbar">
            <button
              onClick={() => setSmartMoneySub("signals")}
              className={`px-3 py-1.5 rounded transition-all whitespace-nowrap ${
                smartMoneySub === "signals" ? "bg-zinc-800 text-emerald-400 font-bold border border-zinc-700" : "text-zinc-400 hover:text-white"
              }`}
            >
              Signals
            </button>
            <button
              onClick={() => setSmartMoneySub("leaderboard")}
              className={`px-3 py-1.5 rounded transition-all whitespace-nowrap ${
                smartMoneySub === "leaderboard" ? "bg-zinc-800 text-emerald-400 font-bold border border-zinc-700" : "text-zinc-400 hover:text-white"
              }`}
            >
              Leaderboard
            </button>
            <button
              onClick={() => setSmartMoneySub("whale_alerts")}
              className={`px-3 py-1.5 rounded transition-all whitespace-nowrap ${
                smartMoneySub === "whale_alerts" ? "bg-zinc-800 text-emerald-400 font-bold border border-zinc-700" : "text-zinc-400 hover:text-white"
              }`}
            >
              Whales
            </button>
            <button
              onClick={() => setSmartMoneySub("copy_engine")}
              className={`px-3 py-1.5 rounded transition-all whitespace-nowrap ${
                smartMoneySub === "copy_engine" ? "bg-zinc-800 text-emerald-400 font-bold border border-zinc-700" : "text-zinc-400 hover:text-white"
              }`}
            >
              Copy Trading
            </button>
            <button
              onClick={() => setSmartMoneySub("holder_bubbles")}
              className={`px-3 py-1.5 rounded transition-all whitespace-nowrap ${
                smartMoneySub === "holder_bubbles" ? "bg-zinc-800 text-emerald-400 font-bold border border-zinc-700" : "text-zinc-400 hover:text-white"
              }`}
            >
              Holder Bubbles
            </button>
            <button
              onClick={() => setSmartMoneySub("following")}
              className={`px-3 py-1.5 rounded transition-all whitespace-nowrap ${
                smartMoneySub === "following" ? "bg-zinc-800 text-emerald-400 font-bold border border-zinc-700" : "text-zinc-400 hover:text-white"
              }`}
            >
              Following
            </button>
          </div>
        );

      case "sniper":
        return (
          <div className="flex items-center gap-1 text-xs font-mono">
            <button
              onClick={() => setSniperSub("auto_sniper")}
              className={`px-3 py-1.5 rounded transition-all ${
                sniperSub === "auto_sniper" ? "bg-zinc-800 text-emerald-400 font-bold border border-zinc-700" : "text-zinc-400 hover:text-white"
              }`}
            >
              Auto-Snipe Bot
            </button>
            <button
              onClick={() => setSniperSub("gas_presets")}
              className={`px-3 py-1.5 rounded transition-all ${
                sniperSub === "gas_presets" ? "bg-zinc-800 text-emerald-400 font-bold border border-zinc-700" : "text-zinc-400 hover:text-white"
              }`}
            >
              Priority Fee & Jito Presets
            </button>
          </div>
        );

      case "wallet":
        return (
          <div className="flex items-center gap-1 text-xs font-mono">
            <button
              onClick={() => setWalletSub("main_wallet")}
              className={`px-3 py-1.5 rounded transition-all ${
                walletSub === "main_wallet" ? "bg-zinc-800 text-emerald-400 font-bold border border-zinc-700" : "text-zinc-400 hover:text-white"
              }`}
            >
              Embedded Wallet
            </button>
            <button
              onClick={() => setWalletSub("sub_wallets")}
              className={`px-3 py-1.5 rounded transition-all ${
                walletSub === "sub_wallets" ? "bg-zinc-800 text-emerald-400 font-bold border border-zinc-700" : "text-zinc-400 hover:text-white"
              }`}
            >
              Multi Sub-Wallets
            </button>
            <button
              onClick={() => setWalletSub("positions_pnl")}
              className={`px-3 py-1.5 rounded transition-all ${
                walletSub === "positions_pnl" ? "bg-zinc-800 text-emerald-400 font-bold border border-zinc-700" : "text-zinc-400 hover:text-white"
              }`}
            >
              Open Positions & PnL
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <TerminalLayout activeTab={activeTab} setActiveTab={setActiveTab} subTabsNav={renderSubTabs()}>
      {activeTab === "home" && (
        <div className="space-y-4">
          <WalletSnapshotHeader />
          <TrendingTokensWidget onSelectToken={handleSelectTokenAndGoToMarket} />
        </div>
      )}

      {activeTab === "market" && !selectedToken && (
        <MarketDiscovery onSelectToken={handleSelectTokenAndGoToMarket} />
      )}

      {activeTab === "smartmoney" && (
        <div className="space-y-4">
          {smartMoneySub === "signals" && <SignalFeed />}
          {smartMoneySub === "leaderboard" && <SmartMoneyLeaderboard />}
          {smartMoneySub === "whale_alerts" && <WhaleTracker />}
          {smartMoneySub === "copy_engine" && <CopyTradingEngine />}
          {smartMoneySub === "holder_bubbles" && (
            selectedToken ? (
              <TokenHolderVisualizer mint={selectedToken.mint} />
            ) : (
              <p className="text-center text-sm text-zinc-500 py-8">Select a token first to view holder bubbles.</p>
            )
          )}
          {smartMoneySub === "following" && <WatchlistManager />}
        </div>
      )}

      {activeTab === "sniper" && (
        <div className="max-w-4xl mx-auto space-y-4">
          {sniperSub === "auto_sniper" && <AutoSniperMEV />}
          {sniperSub === "gas_presets" && <PriorityFeeSettings />}
        </div>
      )}

      {activeTab === "wallet" && (
        <div className="space-y-4">
          {walletSub === "main_wallet" && (
            <div className="max-w-2xl mx-auto">
              <EmbeddedWalletCard />
            </div>
          )}
          {walletSub === "sub_wallets" && <MultiWalletManager />}
          {walletSub === "positions_pnl" && <LivePositionsTracker />}
        </div>
      )}
    </TerminalLayout>
  );
}
