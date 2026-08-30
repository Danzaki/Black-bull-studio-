'use client';

import React from 'react';
import { Zap, TrendingUp, ShieldCheck, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export default function TradingDeskHub() {
  return (
    <div className="h-full grid grid-cols-12 gap-1.5 font-mono">
      
      {/* Left & Middle: TradingView Chart Screen (8 Cols) */}
      <div className="col-span-12 lg:col-span-8 bg-[#0A0C10] border border-slate-800/80 rounded flex flex-col p-2">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="font-black text-white text-xs">$BULL / SOL</span>
            <span className="text-[10px] text-emerald-400 font-bold">$0.004210 (+124.5%)</span>
          </div>
          <div className="flex items-center gap-1 text-[10px]">
            {['1s', '15s', '1m', '5m', '1h'].map((tf) => (
              <button key={tf} className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded">
                {tf}
              </button>
            ))}
          </div>
        </div>
        
        {/* Chart Viewport Placeholder */}
        <div className="flex-1 bg-[#07080C] border border-slate-800/60 rounded flex items-center justify-center text-slate-600 text-xs">
          [TradingView v5 Candlestick Chart Engine Mounted]
        </div>
      </div>

      {/* Right: Instant High-Speed Execution Bar (4 Cols) */}
      <div className="col-span-12 lg:col-span-4 bg-[#0A0C10] border border-slate-800/80 rounded p-2 flex flex-col justify-between">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded border border-slate-800 text-xs font-bold text-center">
            <button className="py-1.5 bg-emerald-500 text-black rounded">BUY</button>
            <button className="py-1.5 text-slate-400 hover:text-white rounded">SELL</button>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-400">AMOUNT (SOL)</label>
            <div className="grid grid-cols-4 gap-1">
              {['0.1', '0.5', '1.0', '5.0'].map((val) => (
                <button key={val} className="py-1 bg-slate-900 border border-slate-800 text-slate-300 text-[10px] rounded hover:border-emerald-500">
                  {val}
                </button>
              ))}
            </div>
          </div>

          <div className="p-2 bg-slate-900/60 border border-slate-800 rounded space-y-1 text-[10px]">
            <div className="flex justify-between text-slate-400">
              <span>ESTIMATED TOKENS:</span>
              <span className="text-white font-bold">118,764 $BULL</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>SLIPPAGE:</span>
              <span className="text-emerald-400 font-bold">AUTO (0.5%)</span>
            </div>
          </div>
        </div>

        <button className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded transition flex items-center justify-center gap-1 shadow-lg shadow-emerald-500/10">
          <Zap className="w-3.5 h-3.5 fill-black" />
          INSTANT BUY (JITO PROTECTED)
        </button>
      </div>

    </div>
  );
}
