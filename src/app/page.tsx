'use client';

import React, { useState } from 'react';
import { 
  Search, 
  Zap, 
  Wallet, 
  TrendingUp, 
  Flame, 
  MessageSquare, 
  Copy, 
  Compass, 
  ArrowUpRight,
  ShieldCheck,
  Bell
} from 'lucide-react';

export default function MobileHomePage() {
  const [activeTab, setActiveTab] = useState<'hot' | 'trenches' | 'callouts'>('hot');

  return (
    <div className="min-h-screen bg-[#090A0F] text-slate-100 flex flex-col font-sans max-w-md mx-auto relative pb-20 select-none">
      
      {/* 1. TOP HEADER & BALANCE */}
      <header className="p-4 border-b border-slate-800/80 bg-[#0D0E15] sticky top-0 z-20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-bold text-emerald-400">
              BB
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">Current Balance</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black text-white">$1,248.50</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-1.5 py-0.2 rounded font-bold">+$142.50</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 bg-slate-900 border border-slate-800 rounded-full text-slate-400">
              <Bell className="w-4 h-4" />
            </button>
            <button className="px-3 py-1.5 bg-emerald-500 text-black font-extrabold text-xs rounded-full flex items-center gap-1 shadow-lg shadow-emerald-500/20">
              <Zap className="w-3.5 h-3.5 fill-black" /> Deposit
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search Token, CA, or Trader..."
            className="w-full bg-[#13151F] border border-slate-800/90 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
      </header>

      {/* 2. LIVE CRYPTO TICKER BAR */}
      <div className="flex items-center gap-4 px-4 py-2 bg-[#0D0E15]/50 border-b border-slate-800/50 text-[11px] font-mono overflow-x-auto whitespace-nowrap">
        <span><span className="text-slate-500">SOL:</span> <span className="text-emerald-400 font-bold">$184.20 (+4.2%)</span></span>
        <span><span className="text-slate-500">BTC:</span> <span className="text-emerald-400 font-bold">$79,601 (+2.1%)</span></span>
        <span><span className="text-slate-500">ETH:</span> <span className="text-emerald-400 font-bold">$2,517 (+1.8%)</span></span>
      </div>

      {/* 3. DISCOVER BANNER */}
      <div className="p-4">
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/30 relative overflow-hidden">
          <div className="relative z-10">
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/80">
              Black Bull Sniper Pro
            </span>
            <h2 className="text-lg font-black text-white mt-1">Discover Faster Trading In Seconds</h2>
            <p className="text-xs text-slate-400 mt-0.5">Track Smart Money & Auto-Snipe Pump.fun</p>
          </div>
        </div>
      </div>

      {/* 4. TABS HEADER */}
      <div className="px-4 flex items-center gap-6 border-b border-slate-800/80 text-xs font-bold">
        <button
          onClick={() => setActiveTab('hot')}
          className={`pb-2 transition relative ${
            activeTab === 'hot' ? 'text-white border-b-2 border-emerald-500' : 'text-slate-500'
          }`}
        >
          🔥 Hot Searches
        </button>
        <button
          onClick={() => setActiveTab('trenches')}
          className={`pb-2 transition relative ${
            activeTab === 'trenches' ? 'text-white border-b-2 border-emerald-500' : 'text-slate-500'
          }`}
        >
          ⚡ Trenches (Pump)
        </button>
        <button
          onClick={() => setActiveTab('callouts')}
          className={`pb-2 transition relative ${
            activeTab === 'callouts' ? 'text-white border-b-2 border-emerald-500' : 'text-slate-500'
          }`}
        >
          💬 Callouts & Feed
        </button>
      </div>

      {/* 5. DYNAMIC TAB CONTENT */}
      <div className="p-4 space-y-3">
        {activeTab === 'hot' && (
          <div className="space-y-2">
            {[
              { name: 'Niu Lai', symbol: '$NIU', price: '$0.0421', mcap: '$62.39M', change: '+8.7%', age: '13d', isUp: true },
              { name: 'Fone Token', symbol: '$FONE', price: '$0.0012', mcap: '$4.59M', change: '+13.7%', age: '8h', isUp: true },
              { name: 'FREEDOM AI', symbol: '$FREE', price: '$0.0004', mcap: '$418K', change: '-4.2%', age: '2h', isUp: false },
            ].map((token, idx) => (
              <div key={idx} className="p-3 bg-[#0D0E15] border border-slate-800/80 rounded-xl flex items-center justify-between active:scale-[0.98] transition">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-slate-300">
                    {token.symbol.substring(1, 3)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-white">{token.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{token.age}</span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">{token.symbol}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-bold text-sm text-white font-mono block">{token.mcap}</span>
                  <span className={`text-xs font-mono font-bold ${token.isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {token.change}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'callouts' && (
          <div className="space-y-3">
            {[
              { user: 'domyxbt', time: '2m ago', text: 'its lock in not login', position: '$148.70', pnl: '-$1.82', mcap: '$21.3K MC' },
              { user: 'chriskogias', time: '9m ago', text: '4k posts in 2hrs ! Gamble', position: '$173.27', pnl: '+$20.34', mcap: '$8.7K MC' }
            ].map((post, idx) => (
              <div key={idx} className="p-3 bg-[#0D0E15] border border-slate-800/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-400">@{post.user}</span>
                  <span className="text-slate-500">{post.time}</span>
                </div>
                <p className="text-xs text-slate-200">{post.text}</p>
                <div className="p-2 bg-[#13151F] rounded-lg flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Pos: <strong className="text-white">{post.position}</strong></span>
                  <span className={post.pnl.startsWith('+') ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{post.pnl}</span>
                  <span className="text-slate-400">{post.mcap}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. BOTTOM NAVIGATION BAR (NAVBAR) */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#0D0E15]/95 backdrop-blur-md border-t border-slate-800/80 px-4 py-2 flex items-center justify-between text-[10px] text-slate-400 z-30">
        <button className="flex flex-col items-center gap-1 text-emerald-400 font-bold">
          <Compass className="w-5 h-5" />
          <span>Discover</span>
        </button>
        <button className="flex flex-col items-center gap-1 hover:text-white">
          <Flame className="w-5 h-5" />
          <span>Trenches</span>
        </button>
        <button className="flex flex-col items-center gap-1 hover:text-white">
          <MessageSquare className="w-5 h-5" />
          <span>Track</span>
        </button>
        <button className="flex flex-col items-center gap-1 hover:text-white">
          <Copy className="w-5 h-5" />
          <span>Copy</span>
        </button>
        <button className="flex flex-col items-center gap-1 hover:text-white">
          <Wallet className="w-5 h-5" />
          <span>Portfolio</span>
        </button>
      </div>

    </div>
  );
}
