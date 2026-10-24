"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import TerminalLayout from "@/components/layout/TerminalLayout";
import SubTabs from "@/components/layout/SubTabs";
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

  const renderSubTabs = () => {
    switch (activeTab) {
      case "smartmoney":
        return (
          <SubTabs
            active={smartMoneySub}
            onChange={setSmartMoneySub}
            tabs={[
              { id: "signals", label: "Signals" },
              { id: "leaderboard", label: "Leaderboard" },
              { id: "whale_alerts", label: "Whales" },
              { id: "copy_engine", label: "Copy Trading" },
              { id: "holder_bubbles", label: "Holder Bubbles" },
              { id: "following", label: "Following" },
            ]}
          />
        );
      case "sniper":
        return (
          <SubTabs
            active={sniperSub}
            onChange={setSniperSub}
            tabs={[
              { id: "auto_sniper", label: "Auto-Snipe Bot" },
              { id: "gas_presets", label: "Priority Fee & Jito" },
            ]}
          />
        );
      case "wallet":
        return (
          <SubTabs
            active={walletSub}
            onChange={setWalletSub}
            tabs={[
              { id: "main_wallet", label: "Embedded Wallet" },
              { id: "positions_pnl", label: "Positions & PnL" },
            ]}
          />
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
          <NewPairsRadar onSelectToken={handleSelectTokenAndGoToMarket} />
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
          {walletSub === "positions_pnl" && <LivePositionsTracker />}
        </div>
      )}
    </TerminalLayout>
  );
}
