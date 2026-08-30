"use client";

import React, { useState } from "react";
import { Zap, ArrowDownUp, Flame, ShieldAlert, Sparkles, RefreshCw } from "lucide-react";

interface SolanaSwapFormProps {
  symbol: string;
  currentPrice: number | null;
}

export default function SolanaSwapForm({ symbol, currentPrice }: SolanaSwapFormProps) {
  const [mode, setMode] = useState<"BUY" | "SELL">("BUY");
  const [amount, setAmount] = useState<string>("0.5");
  const [isExecuting, setIsExecuting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const presetSolAmounts = [0.1, 0.5, 1.0, 2.0, 5.0];
  const presetSellPercents = [25, 50, 75, 100];

  const handleQuickPreset = (val: number) => {
    setAmount(val.toString());
  };

  const handleQuickPercentSell = (percent: number) => {
    // Demo calculation for percent sell
    setAmount(`${percent}%`);
  };

  const handleExecuteTrade = (e: React.FormEvent) => {
    e.preventDefault();
    setIsExecuting(true);
    setSuccessMessage(null);

    setTimeout(() => {
      setIsExecuting(false);
      setSuccessMessage(
        `${mode === "BUY" ? "Bought" : "Sold"} ${symbol} successfully via Jito MEV Bundle!`
      );
      setTimeout(() => setSuccessMessage(null), 3000);
    }, 800);
  };

  return (
    <div className="rounded-xl border border-zinc-900 bg-zinc-950 p-4 space-y-3 font-mono shadow-xl">
      {/* Header & Mode Switcher */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-2.5">
        <div className="flex items-center gap-1.5">
          <Zap className="h-4 w-4 text-emerald-400 animate-pulse" />
          <h3 className="text-xs font-black tracking-wider text-white">INSTANT SNIPE / SWAP</h3>
        </div>
        <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800">
          <button
            onClick={() => { setMode("BUY"); setAmount("0.5"); }}
            className={`px-3 py-1 rounded text-[11px] font-bold transition-all ${
              mode === "BUY"
                ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            BUY
          </button>
          <button
            onClick={() => { setMode("SELL"); setAmount("50%"); }}
            className={`px-3 py-1 rounded text-[11px] font-bold transition-all ${
              mode === "SELL"
                ? "bg-rose-500 text-black shadow-lg shadow-rose-500/20"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            SELL
          </button>
        </div>
      </div>

      {/* Instant Action Presets (Photon / BullX Style) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] text-zinc-400">
          <span>{mode === "BUY" ? "QUICK SOL PRESETS" : "QUICK SELL %"}</span>
          <span className="text-emerald-400 font-bold">1-CLICK EXECUTION</span>
        </div>

        {mode === "BUY" ? (
          <div className="grid grid-cols-5 gap-1.5">
            {presetSolAmounts.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => handleQuickPreset(amt)}
                className={`py-1.5 rounded border text-[11px] font-black transition-all ${
                  amount === amt.toString()
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                    : "bg-zinc-900/40 border-zinc-900 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/50"
                }`}
              >
                {amt} SOL
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-1.5">
            {presetSellPercents.map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => handleQuickPercentSell(pct)}
                className={`py-1.5 rounded border text-[11px] font-black transition-all ${
                  amount === `${pct}%`
                    ? "bg-rose-500/20 border-rose-500 text-rose-400"
                    : "bg-zinc-900/40 border-zinc-900 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/50"
                }`}
              >
                {pct === 100 ? "MAX" : `${pct}%`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Trade Execution Form */}
      <form onSubmit={handleExecuteTrade} className="space-y-3 pt-1">
        <div>
          <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
            <span>{mode === "BUY" ? "AMOUNT IN SOL" : "AMOUNT TO SELL"}</span>
            <span>BALANCE: 12.45 SOL</span>
          </div>
          <div className="relative">
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg px-3 py-2 text-sm font-bold text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
              required
            />
            <span className="absolute right-3 top-2.5 text-xs text-zinc-400 font-bold">
              {mode === "BUY" ? "SOL" : symbol}
            </span>
          </div>
        </div>

        {/* Dynamic Estimated Output */}
        <div className="p-2.5 bg-zinc-900/30 rounded-lg border border-zinc-900 text-[11px] space-y-1">
          <div className="flex justify-between text-zinc-400">
            <span>Estimated Output</span>
            <span className="text-white font-bold">
              {mode === "BUY"
                ? `${((parseFloat(amount) || 0) * 1250).toLocaleString()} ${symbol}`
                : `${((parseFloat(amount) || 0) * 0.0008).toFixed(4)} SOL`}
            </span>
          </div>
          <div className="flex justify-between text-zinc-500 text-[10px]">
            <span>Est. Slippage & MEV Tip</span>
            <span className="text-emerald-400">1.0% | Jito 0.005 SOL</span>
          </div>
        </div>

        {/* Main Action Button */}
        <button
          type="submit"
          disabled={isExecuting}
          className={`w-full py-3 rounded-lg font-black text-xs tracking-wider transition-all flex items-center justify-center gap-2 ${
            mode === "BUY"
              ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20"
              : "bg-rose-500 hover:bg-rose-400 text-black shadow-lg shadow-rose-500/20"
          } ${isExecuting ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {isExecuting ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" /> EXECUTING JITO BUNDLE...
            </>
          ) : (
            <>
              <Flame className="h-4 w-4 fill-current" />
              {mode === "BUY" ? `INSTANT BUY ${symbol}` : `INSTANT SELL ${symbol}`}
            </>
          )}
        </button>
      </form>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-[11px] font-bold text-center animate-pulse">
          {successMessage}
        </div>
      )}
    </div>
  );
}
