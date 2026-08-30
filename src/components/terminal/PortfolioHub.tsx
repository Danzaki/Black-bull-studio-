'use client';

import React from 'react';
import { Wallet, ShieldCheck, Zap, Plus } from 'lucide-react';

export default function PortfolioHub() {
  return (
    <div className="h-full bg-[#0A0C10] border border-slate-800/80 rounded p-3 font-mono space-y-4 overflow-y-auto">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold text-white tracking-wider">MULTI-WALLET MANAGER</h3>
        </div>
        <button className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded text-[10px] flex items-center gap-1 font-bold">
          <Plus className="w-3 h-3" /> ADD SUB-WALLET
        </button>
      </div>

      <div className="space-y-2">
        {[
          { id: 1, name: 'Main Sniper Bot', bal: '14.52 SOL', tokens: 4, primary: true },
          { id: 2, name: 'Whale Tracker Sub-A', bal: '2.10 SOL', tokens: 1, primary: false },
        ].map((w) => (
          <div key={w.id} className="p-2 bg-slate-900/80 border border-slate-800 rounded flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-300">W{w.id}</span>
              <div>
                <span className="font-bold text-white block">{w.name}</span>
                <span className="text-[9px] text-slate-500">7xKP...9mQ2</span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-bold text-emerald-400 block">{w.bal}</span>
              <span className="text-[9px] text-slate-400">{w.tokens} Active Tokens</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
