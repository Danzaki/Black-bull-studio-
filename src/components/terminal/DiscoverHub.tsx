'use client';

import React from 'react';
import { 
  ShieldCheck, 
  Flame, 
  Zap, 
  Filter
} from 'lucide-react';

interface DiscoverHubProps {
  onSelectToken: () => void;
}

export default function DiscoverHub({ onSelectToken }: DiscoverHubProps) {
  return (
    <div className="h-full flex flex-col bg-[#0A0C10] border border-slate-800/80 rounded overflow-hidden font-mono">
      
      {/* Sub-Header Filter Bar */}
      <div className="h-8 border-b border-slate-800/80 px-2.5 flex items-center justify-between text-[11px] bg-slate-900/50">
        <div className="flex items-center gap-2">
          <Filter className="w-3 h-3 text-slate-500" />
          <span className="text-slate-400 font-bold">LIVE PAIRS:</span>
          <button className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded font-bold text-[10px]">ALL POOLS</button>
          <button className="px-2 py-0.5 text-slate-400 hover:text-white text-[10px]">PUMP.FUN</button>
          <button className="px-2 py-0.5 text-slate-400 hover:text-white text-[10px]">RAYDIUM</button>
        </div>

        <div className="text-[10px] text-slate-500">
          AUTO-REFRESH: <span className="text-emerald-400 font-bold">REALTIME</span>
        </div>
      </div>

      {/* High Density Streaming Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left border-collapse text-[11px]">
          <thead className="sticky top-0 bg-[#0D0F16] border-b border-slate-800 text-slate-500 uppercase text-[9px] tracking-wider z-10">
            <tr>
              <th className="p-2">PAIR / TOKEN</th>
              <th className="p-2">AGE</th>
              <th className="p-2">PRICE</th>
              <th className="p-2">5M %</th>
              <th className="p-2">MCAP</th>
              <th className="p-2">LIQUIDITY</th>
              <th className="p-2">AUDIT SECURITY</th>
              <th className="p-2 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <tr key={i} className="hover:bg-slate-900/60 transition group cursor-pointer" onClick={onSelectToken}>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 text-[10px]">
                      BL
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-white group-hover:text-emerald-400 transition">Solana Bull AI</span>
                        <span className="text-[9px] text-slate-500">$BULL</span>
                        <span className="px-1 text-[8px] bg-emerald-950 text-emerald-400 border border-emerald-800 rounded">PUMP</span>
                      </div>
                      <span className="text-[9px] text-slate-600 block -mt-0.5">8x2P...pump</span>
                    </div>
                  </div>
                </td>

                <td className="p-2 text-slate-400">12m</td>
                <td className="p-2 font-bold text-slate-200">$0.004210</td>
                <td className="p-2 font-bold text-emerald-400">+124.5%</td>
                <td className="p-2 text-slate-300">$421.0K</td>
                <td className="p-2 text-slate-300">$45.0K</td>

                <td className="p-2">
                  <div className="flex items-center gap-1">
                    <span className="px-1 py-0.2 bg-emerald-950 text-emerald-400 text-[9px] border border-emerald-800 rounded flex items-center gap-0.5">
                      <ShieldCheck className="w-2.5 h-2.5" /> Mint Revoked
                    </span>
                    <span className="px-1 py-0.2 bg-amber-950 text-amber-400 text-[9px] border border-amber-800 rounded flex items-center gap-0.5">
                      <Flame className="w-2.5 h-2.5" /> LP Burn
                    </span>
                  </div>
                </td>

                <td className="p-2 text-right">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectToken();
                    }}
                    className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-[10px] rounded flex items-center gap-1 ml-auto shadow-md shadow-emerald-500/10"
                  >
                    <Zap className="w-3 h-3 fill-black" />
                    SNIPE 0.5 SOL
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
