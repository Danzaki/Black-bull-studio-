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
import WalletSnapshotHeader from "@/components/terminal/WalletSnapshotHeader";
import WhaleTracker from "@/components/terminal/WhaleTracker";
import CopyTradingEngine from "@/components/terminal/CopyTradingEngine";
import MultiWalletManager from "@/components/terminal/MultiWalletManager";
import AutoSniperMEV from "@/components/terminal/AutoSniperMEV";
import TokenHolderVisualizer from "@/components/terminal/TokenHolderVisualizer";
import PriorityFeeSettings from "@/components/terminal/PriorityFeeSettings";
import RealtimeDepthVisualizer from "@/components/terminal/RealtimeDepthVisualizer";
import WebSocketLiveBadge from "@/components/terminal/WebSocketLiveBadge";

import { useSolanaPrice } from "@/hooks/useSolanaPrice";
import { useTokenOHLCV } from "@/hooks/useTokenOHLCV";
import { TokenInfo, Timeframe, POPULAR_TOKENS } from "@/types/terminal";

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000000";

export default function TerminalPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<MainTab>("home");

  const [homeSub, setHomeSub] = useState<HomeSubTab>("overview");
  const [marketSub, setMarketSub] = useState<MarketSubTab>("chart_terminal");
  const [smartMoneySub, setSmartMoneySub] = useState<SmartMoneySubTab>("whale_alerts");
  const [sniperSub, setSniperSub] = useState<SniperSubTab>("auto_sniper");
  const [walletSub, setWalletSub] = useState<WalletSubTab>("main_wallet");

  const [selectedToken, setSelectedToken] = useState<TokenInfo>(POPULAR_TOKENS[0]);
  const [timeframe, setTimeframe] = useState<Timeframe>("15m");
  const [tokenSelected, setTokenSelected] = useState(false);

  const { price, loading } = useSolanaPrice(selectedToken.symbol);
  const { candles, loading: chartLoading } = useTokenOHLCV(selectedToken.poolAddress || null, timeframe);

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

      case "market":
        return (
          <div className="flex items-center gap-1 text-xs font-mono">
            <button
              onClick={() => setMarketSub("chart_terminal")}
              className={`px-3 py-1.5 rounded transition-all ${
                marketSub === "chart_terminal" ? "bg-zinc-800 text-emerald-400 font-bold border border-zinc-700" : "text-zinc-400 hover:text-white"
              }`}
            >
              Pro Chart & Trade
            </button>
            <button
              onClick={() => setMarketSub("orderbook_depth")}
              className={`px-3 py-1.5 rounded transition-all ${
                marketSub === "orderbook_depth" ? "bg-zinc-800 text-emerald-400 font-bold border border-zinc-700" : "text-zinc-400 hover:text-white"
              }`}
            >
              Orderbook & Depth
            </button>
            <button
              onClick={() => setMarketSub("liquidity_radar")}
              className={`px-3 py-1.5 rounded transition-all ${
                marketSub === "liquidity_radar" ? "bg-zinc-800 text-emerald-400 font-bold border border-zinc-700" : "text-zinc-400 hover:text-white"
              }`}
            >
              Liquidity Radar
            </button>
            <button
              onClick={() => setMarketSub("security_audit")}
              className={`px-3 py-1.5 rounded transition-all ${
                marketSub === "security_audit" ? "bg-zinc-800 text-emerald-400 font-bold border border-zinc-700" : "text-zinc-400 hover:text-white"
              }`}
            >
              Rug Security Scanner
            </button>
          </div>
        );

      case "smartmoney":
        return (
          <div className="flex items-center gap-1 text-xs font-mono">
            <button
              onClick={() => setSmartMoneySub("whale_alerts")}
              className={`px-3 py-1.5 rounded transition-all ${
                smartMoneySub === "whale_alerts" ? "bg-zinc-800 text-emerald-400 font-bold border border-zinc-700" : "text-zinc-400 hover:text-white"
              }`}
            >
              Whale Alerts Stream
            </button>
            <button
              onClick={() => setSmartMoneySub("copy_engine")}
              className={`px-3 py-1.5 rounded transition-all ${
                smartMoneySub === "copy_engine" ? "bg-zinc-800 text-emerald-400 font-bold border border-zinc-700" : "text-zinc-400 hover:text-white"
              }`}
            >
              Copy Trading Engine
            </button>
            <button
              onClick={() => setSmartMoneySub("holder_bubbles")}
              className={`px-3 py-1.5 rounded transition-all ${
                smartMoneySub === "holder_bubbles" ? "bg-zinc-800 text-emerald-400 font-bold border border-zinc-700" : "text-zinc-400 hover:text-white"
              }`}
            >
              Holder Bubbles Visualizer
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
      {tokenSelected && (
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-zinc-900 pb-3">
          <TokenHeaderMetrics
            selectedToken={selectedToken}
            onSelectToken={handleSelectToken}
            timeframe={timeframe}
            onSelectTimeframe={setTimeframe}
            currentPrice={loading ? null : price}
          />
          <WebSocketLiveBadge />
        </div>
      )}

      {activeTab === "home" && (
        <div className="space-y-4">
          <WalletSnapshotHeader />
          <TrendingTokensWidget onSelectToken={handleSelectTokenAndGoToMarket} />
        </div>
      )}

      {activeTab === "market" && (
        <div className="space-y-4">
          {marketSub === "chart_terminal" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-8 space-y-4">
                <div className="rounded-xl border border-zinc-900 bg-zinc-950 overflow-hidden shadow-2xl">
                  <SolanaTradingChart symbol={selectedToken.symbol} candles={candles} loading={chartLoading} />
                </div>
                <SolanaTradeHistory poolAddress={selectedToken.poolAddress || null} />
              </div>
              <div className="lg:col-span-4 space-y-4">
                <SolanaSwapForm symbol={selectedToken.symbol} currentPrice={loading ? null : price} />
                <RealtimeDepthVisualizer symbol={selectedToken.symbol} currentPrice={loading ? null : price} />
              </div>
            </div>
          )}

          {marketSub === "orderbook_depth" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SolanaOrderBook currentPrice={loading ? null : price} />
              <RealtimeDepthVisualizer symbol={selectedToken.symbol} currentPrice={loading ? null : price} />
            </div>
          )}

          {marketSub === "liquidity_radar" && (
            <NewPairsRadar onSelectToken={handleSelectToken} />
          )}

          {marketSub === "security_audit" && (
            <div className="max-w-3xl mx-auto">
              <TokenSecurityScanner mint={selectedToken.mint} />
            </div>
          )}
        </div>
      )}

      {activeTab === "smartmoney" && (
        <div className="space-y-4">
          {smartMoneySub === "whale_alerts" && <WhaleTracker />}
          {smartMoneySub === "copy_engine" && <CopyTradingEngine />}
          {smartMoneySub === "holder_bubbles" && <TokenHolderVisualizer symbol={selectedToken.symbol} />}
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
          {walletSub === "positions_pnl" && <LivePositionsTracker userId={DEMO_USER_ID} />}
        </div>
      )}
    </TerminalLayout>
  );
}
