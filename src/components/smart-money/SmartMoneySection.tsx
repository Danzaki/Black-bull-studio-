'use client';

import React, { useState } from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Wallet,
  Activity,
  Filter,
  Copy,
  Check,
  TrendingUp,
  ExternalLink,
  Award,
  Flame,
  Clock,
  Search,
  Zap
} from 'lucide-react';

interface SmartWallet {
  address: string;
  label: string;
  winRate: number;
  totalPnl: string;
  solBalance: string;
  recentToken: string;
  action: 'BUY' | 'SELL';
  amountUsd: string;
  timeAgo: string;
  isVerified: boolean;
}

interface KolWallet {
  name: string;
  handle: string;
  token: string;
  pnl: string;
  status: string;
  solBalance: string;
}

export default function SmartMoneySection() {
  const [activeSubTab, setActiveSubTab] = useState<'signals' | 'top_traders' | 'hot_kols' | 'history'>('signals');
  const [filter, setFilter] = useState<'all' | 'high_win' | 'whales'>('all');
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // High-performance Smart Money Wallets (Preserved & Extended)
  const wallets: SmartWallet[] = [
    {
      address: '7xKX...9Wq2',
      label: 'Smart Money Alpha',
      winRate: 84.2,
      totalPnl: '+$142,500',
      solBalance: '420.5 SOL',
      recentToken: '$BONK',
      action: 'BUY',
      amountUsd: '$12,400',
      timeAgo: '2m ago',
      isVerified: true,
    },
    {
      address: '3mPz...4Kx1',
      label: 'Whale Position',
      winRate: 76.8,
      totalPnl: '+$89,120',
      solBalance: '1,250.0 SOL',
      recentToken: '$WIF',
      action: 'BUY',
      amountUsd: '$45,000',
      timeAgo: '5m ago',
      isVerified: true,
    },
    {
      address: '9qLv...1Mm8',
      label: 'Sniper Bot Node',
      winRate: 91.5,
      totalPnl: '+$310,400',
      solBalance: '88.2 SOL',
      recentToken: '$POPCAT',
      action: 'SELL',
      amountUsd: '$8,900',
      timeAgo: '12m ago',
      isVerified: false,
    },
    {
      address: '5kR1...90vQ',
      label: 'Insider Dev Vault',
      winRate: 88.0,
      totalPnl: '+$52,800',
      solBalance: '512.0 SOL',
      recentToken: '$SOL',
      action: 'BUY',
      amountUsd: '$22,100',
      timeAgo: '18m ago',
      isVerified: true,
    }
  ];

  const kols: KolWallet[] = [
    { name: 'Ansem Insider Wallet', handle: '@blknoiz06', token: '$SOL', pnl: '+340%', status: 'Holding 4,000,000 tokens', solBalance: '850 SOL' },
    { name: 'Crash Trading Vault', handle: '@CrashiusClay69', token: '$BULL', pnl: '+120%', status: 'Bought 10m ago', solBalance: '310 SOL' },
    { name: 'Murad Alpha Stream', handle: '@MustStopMurad', token: '$SPX', pnl: '+890%', status: 'Heavy Accumulation', solBalance: '1,500 SOL' },
    { name: 'Pow23 Whale Tank', handle: '@pow23', token: '$PEPE', pnl: '+45%', status: 'Partial Profit Taken', solBalance: '190 SOL' }
  ];

  const handleCopy = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const filteredWallets = wallets.filter((w) => {
    const matchesSearch = searchQuery === '' || 
      w.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
      w.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.recentToken.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filter === 'high_win') return w.winRate >= 80;
    if (filter === 'whales') return parseFloat(w.solBalance.replace(/[^0-9.]/g, '')) >= 400;
    return true;
  });

  return (
    <div className="w-full space-y-3 font-mono text-xs">
      {/* 1. HEADER & SUB-TAB NAVIGATION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-2.5 gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveSubTab('signals')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
              activeSubTab === 'signals'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                : 'bg-[#0D0E15] border border-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            LIVE SIGNALS
          </button>

          <button
            onClick={() => setActiveSubTab('top_traders')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
              activeSubTab === 'top_traders'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                : 'bg-[#0D0E15] border border-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            TOP TRADERS
          </button>

          <button
            onClick={() => setActiveSubTab('hot_kols')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
              activeSubTab === 'hot_kols'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                : 'bg-[#0D0E15] border border-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-rose-500" />
            HOT KOLS / INSIDERS
          </button>

          <button
            onClick={() => setActiveSubTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
              activeSubTab === 'history'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                : 'bg-[#0D0E15] border border-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            HISTORY
          </button>
        </div>

        <span className="text-[10px] font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 px-2.5 py-1 rounded font-semibold self-start sm:self-auto">
          LIVE ON-CHAIN
        </span>
      </div>

      {/* 2. FILTER & SEARCH BAR */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-md border text-[11px] transition ${
              filter === 'all'
                ? 'bg-slate-800 border-slate-700 text-white font-bold'
                : 'bg-[#0D0E15] border-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            All Activity
          </button>
          <button
            onClick={() => setFilter('high_win')}
            className={`px-2.5 py-1 rounded-md border text-[11px] transition flex items-center gap-1 ${
              filter === 'high_win'
                ? 'bg-slate-800 border-slate-700 text-emerald-400 font-bold'
                : 'bg-[#0D0E15] border-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3 h-3" />
            Win &gt; 80%
          </button>
          <button
            onClick={() => setFilter('whales')}
            className={`px-2.5 py-1 rounded-md border text-[11px] transition flex items-center gap-1 ${
              filter === 'whales'
                ? 'bg-slate-800 border-slate-700 text-blue-400 font-bold'
                : 'bg-[#0D0E15] border-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wallet className="w-3 h-3" />
            Whales (&gt;400 SOL)
          </button>
        </div>

        <div className="relative w-full sm:w-auto">
          <Search className="w-3 h-3 absolute left-2.5 top-2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search wallet, label or token..."
            className="w-full sm:w-48 bg-[#0D0E15] border border-slate-800/80 rounded-md pl-7 pr-2 py-1 text-[10px] text-white focus:outline-none focus:border-emerald-500/50"
          />
        </div>
      </div>

      {/* 3. DYNAMIC TAB CONTENT */}

      {/* --- TAB 1: LIVE SIGNALS & CARDS --- */}
      {activeSubTab === 'signals' && (
        <div className="space-y-2.5">
          {filteredWallets.map((wallet, idx) => {
            const isBuy = wallet.action === 'BUY';
            return (
              <div
                key={idx}
                className="p-3 bg-[#0D0E15] border border-slate-800/80 rounded-xl space-y-2.5 hover:border-slate-700 transition"
              >
                {/* Card Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
                      <Wallet className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white font-mono">
                          {wallet.label}
                        </span>
                        {wallet.isVerified && (
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                        <span>{wallet.address}</span>
                        <button
                          onClick={() => handleCopy(wallet.address)}
                          className="hover:text-white"
                        >
                          {copiedAddress === wallet.address ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[9px] text-slate-500 uppercase block">Win Rate</span>
                    <span className="text-xs font-bold text-emerald-400">{wallet.winRate}%</span>
                  </div>
                </div>

                {/* Card Stats Grid */}
                <div className="grid grid-cols-3 gap-2 p-2 bg-[#13151F] rounded-lg text-[11px] border border-slate-800/50">
                  <div>
                    <span className="text-slate-500 text-[9px] uppercase block">Total PnL</span>
                    <span className="font-bold text-emerald-400">{wallet.totalPnl}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[9px] uppercase block font-mono">Balance</span>
                    <span className="font-bold text-slate-200">{wallet.solBalance}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 text-[9px] uppercase block">Activity</span>
                    <span className="text-slate-400">{wallet.timeAgo}</span>
                  </div>
                </div>

                {/* Card Execution & Action */}
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        isBuy
                          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                          : 'bg-rose-950/60 text-rose-400 border-rose-800/60'
                      }`}
                    >
                      {wallet.action}
                    </span>
                    <span className="font-bold text-white">{wallet.recentToken}</span>
                    <span className="text-slate-400">({wallet.amountUsd})</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-black font-extrabold border border-emerald-500/40 rounded transition flex items-center gap-1 text-[10px]">
                      <Zap className="w-3 h-3 fill-current" />
                      COPY
                    </button>
                    <button className="px-2 py-1 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-[10px] font-bold rounded-md flex items-center gap-1 transition">
                      Track <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- TAB 2: TOP TRADERS LEADERBOARD --- */}
      {activeSubTab === 'top_traders' && (
        <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-[#0D0E15]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead className="bg-[#13151F] border-b border-slate-800 text-slate-500 uppercase text-[9px]">
                <tr>
                  <th className="p-2.5">RANK / TRADER</th>
                  <th className="p-2.5">REALIZED PNL</th>
                  <th className="p-2.5">WIN RATE</th>
                  <th className="p-2.5">SOL BALANCE</th>
                  <th className="p-2.5 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {filteredWallets.map((w, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/60 transition">
                    <td className="p-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] ${idx === 0 ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-300'}`}>
                          #{idx + 1}
                        </span>
                        <div>
                          <span className="font-bold text-white block">{w.label}</span>
                          <span className="text-[10px] text-slate-500">{w.address}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-2.5 font-bold text-emerald-400">{w.totalPnl}</td>
                    <td className="p-2.5 font-bold text-amber-400">{w.winRate}%</td>
                    <td className="p-2.5 text-slate-300">{w.solBalance}</td>
                    <td className="p-2.5 text-right">
                      <button className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-bold text-[10px]">
                        Track
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 3: HOT KOLS & INSIDERS --- */}
      {activeSubTab === 'hot_kols' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {kols.map((kol, i) => (
            <div key={i} className="p-3 bg-[#0D0E15] border border-slate-800/80 rounded-xl flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white">{kol.name}</span>
                  <span className="text-[10px] text-sky-400">{kol.handle}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Active Token: <span className="font-bold text-emerald-400">{kol.token}</span> ({kol.pnl})
                </div>
                <div className="flex items-center gap-2 text-[9px] text-slate-500 mt-0.5">
                  <span>{kol.status}</span>
                  <span>•</span>
                  <span className="text-slate-400">{kol.solBalance}</span>
                </div>
              </div>
              <button className="px-2.5 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-lg font-bold hover:bg-emerald-500 hover:text-black transition text-[10px]">
                Inspect
              </button>
            </div>
          ))}
        </div>
      )}

      {/* --- TAB 4: HISTORY LOG --- */}
      {activeSubTab === 'history' && (
        <div className="p-6 bg-[#0D0E15] border border-slate-800/80 rounded-xl text-center space-y-2">
          <Clock className="w-7 h-7 text-sky-400 mx-auto opacity-80" />
          <h3 className="font-bold text-white text-xs">Smart Money Historical Indexer</h3>
          <p className="text-slate-400 text-[10px] max-w-sm mx-auto">
            Displaying indexed historical transactions from tracked smart wallets over the last 30 days.
          </p>
        </div>
      )}
    </div>
  );
}
