"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import TerminalLayout from "@/components/layout/TerminalLayout";
import { MainTab, HomeSubTab, MarketSubTab, SmartMoneySubTab, SniperSubTab, WalletSubTab } from "@/types/navigation";

import SolanaTradingChart from "@/components/terminal/SolanaTradingChart";
import SolanaOrderBook from "@/components/terminal/SolanaOrderBook";
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

  return (
    <TerminalLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === "home" && (
        <div className="space-y-4">
          <WalletSnapshotHeader />
          <TrendingTokensWidget onSelectToken={handleSelectTokenAndGoToMarket} />
          <NewPairsRadar onSelectToken={handleSelectTokenAndGoToMarket} />
        </div>
      )}

      {activeTab === "market" && !selectedToken && (
        <MarketDiscovery onSelectToken={handleSelectTokenAndGoToMarket} />
      )}

      {activeTab === "smartmoney" && (
        <div className="space-y-4">
          <SignalFeed />
          <SmartMoneyLeaderboard />
          <WhaleTracker />
          <CopyTradingEngine />
          {(
            selectedToken ? (
              <TokenHolderVisualizer mint={selectedToken.mint} />
            ) : (
              <p className="text-center text-sm text-zinc-500 py-8">Select a token first to view holder bubbles.</p>
            )
          )}
          <WatchlistManager />
        </div>
      )}

      {activeTab === "sniper" && (
        <div className="max-w-4xl mx-auto space-y-4">
          <AutoSniperMEV />
          <PriorityFeeSettings />
        </div>
      )}

      {activeTab === "wallet" && (
        <div className="space-y-4">
          {(
            <div className="max-w-2xl mx-auto">
              <EmbeddedWalletCard />
            </div>
          )}
          <LivePositionsTracker />
        </div>
      )}
    </TerminalLayout>
  );
}
