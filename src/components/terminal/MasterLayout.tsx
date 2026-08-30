'use client';

import React, { useState } from 'react';
import { 
  Zap, 
  ShieldCheck, 
  Search, 
  Settings,
  LayoutGrid,
  TrendingUp,
  Wallet
} from 'lucide-react';
import DiscoverHub from './DiscoverHub';
import TradingDeskHub from './TradingDeskHub';
import PortfolioHub from './PortfolioHub';

export type ViewMode = 'radar' | 'chart' | 'portfolio';

export default function MasterLayout() {
  const [viewMode, setViewMode] = useState<ViewMode>('radar');
  const [quickBuyPreset, setQuickBuyPreset] = useState<string>('0.5');
  const [jitoTip, setJitoTip] = useState<string>('0.005');

  return (
    <div className="h-screen w-screen bg-[#07080C] text-slate-200 flex flex-col font-mono overflow-hidden select-none">
      
      {/* TOP INSTITUTIONAL BAR */}
      <header className="h-10 border-b border-slate-800/90 bg-[#0A0C10] px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/20" />
            </div>
            <span className="text-xs font-black tracking-wider text-white">BLACK BULL</span>
            <span className="text-[9px] px-1 bg-emerald-950 text-emerald-400 border border-emerald-800/80 rounded font-bold">PRO</span>
          </div>

          <div className="h-4 w-[1px] bg-slate-800" />

          <div className="flex items-center gap-0.5 bg-slate-900/90 p-0.5 rounded border border-slate-800 text-[11px]">
            <button
              onClick={() => setViewMode('radar')}
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded transition ${
                viewMode === 'radar' ? 'bg-emerald-500 text-black font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3 h-3" />
              RADAR
            </button>

            <button
              onClick={() => setViewMode('chart')}
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded transition ${
                viewMode === 'chart' ? 'bg-emerald-500 text-black font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              TRADING DESK
            </button>

            <button
              onClick={() => setViewMode('portfolio')}
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded transition ${
                viewMode === 'portfolio' ? 'bg-emerald-500 text-black font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Wallet className="w-3 h-3" />
              WALLETS
            </button>
          </div>
        </div>

        <div className="relative w-80 hidden md:block">
          <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Paste Token Contract Address (CA) or symbol..."
            className="w-full bg-slate-900/90 border border-slate-800/80 rounded pl-7 pr-3 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
            <span className="text-slate-500 text-[10px]">PRESET:</span>
            {['0.1', '0.5', '1.0', '5.0'].map((amt) => (
              <button
                key={amt}
                onClick={() => setQuickBuyPreset(amt)}
                className={`px-1.5 py-0.2 text-[10px] rounded font-bold transition ${
                  quickBuyPreset === amt ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {amt}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
            <ShieldCheck className="w-3 h-3 text-cyan-400" />
            <span className="text-slate-400 text-[10px]">MEV:</span>
            <span className="text-cyan-400 font-bold">{jitoTip} SOL</span>
          </div>

          <div className="hidden lg:flex items-center gap-1 text-slate-300 font-bold">
            <span className="text-slate-500">SOL:</span>
            <span className="text-emerald-400">$184.20</span>
          </div>

          <button className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded">
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* MAIN WORKSPACE CONTAINER */}
      <div className="flex-1 overflow-hidden relative p-1.5">
        {viewMode === 'radar' && <DiscoverHub onSelectToken={() => setViewMode('chart')} />}
        {viewMode === 'chart' && <TradingDeskHub />}
        {viewMode === 'portfolio' && <PortfolioHub />}
      </div>

      {/* BOTTOM STICKY POSITIONS BAR */}
      <footer className="h-8 border-t border-slate-800/90 bg-[#0A0C10] px-3 flex items-center justify-between shrink-0 text-[11px]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-slate-300">POSITIONS (1)</span>
          </div>
          <div className="flex items-center gap-3 font-bold">
            <span className="text-slate-400">$BULL: <span className="text-emerald-400">+$142.50 (+34.2%)</span></span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="px-2 py-0.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded text-[10px] font-bold transition">
            CLOSE ALL POSITIONS
          </button>
        </div>
      </footer>

    </div>
  );
}
