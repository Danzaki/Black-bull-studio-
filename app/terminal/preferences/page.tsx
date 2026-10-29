"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, SlidersHorizontal, Zap } from "lucide-react";
import TerminalPageHeader from "@/components/layout/TerminalPageHeader";

interface TradingPrefs {
  defaultSlippage: number;
  confirmBeforeTrade: boolean;
  mevProtectionDefault: boolean;
  quickBuyAmounts: number[];
}

const DEFAULT_PREFS: TradingPrefs = {
  defaultSlippage: 10,
  confirmBeforeTrade: true,
  mevProtectionDefault: true,
  quickBuyAmounts: [0.1, 0.25, 0.5, 1, 2],
};

const STORAGE_KEY = "bb_trading_prefs";

export default function PreferencesPage() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<TradingPrefs>(DEFAULT_PREFS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
    } catch {
      // ignore corrupted storage
    }
  }, []);

  function save(next: TradingPrefs) {
    setPrefs(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="min-h-screen bg-bb-bg text-zinc-100">
      <TerminalPageHeader
        title="Trading Preferences"
        right={saved ? <span className="pr-3 text-sm font-semibold text-bb-up">Saved</span> : undefined}
      />

      <div className="p-4 space-y-4">
        <div className="rounded-2xl border border-bb-border bg-bb-surface p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
            <SlidersHorizontal className="h-3.5 w-3.5" /> Default Slippage
          </div>
          <div className="flex gap-2">
            {[5, 10, 15, 25].map((val) => (
              <button
                key={val}
                onClick={() => save({ ...prefs, defaultSlippage: val })}
                className={`flex-1 h-11 rounded-xl text-sm font-semibold transition active:scale-95 ${
                  prefs.defaultSlippage === val
                    ? "bg-bb-accent text-black"
                    : "bg-bb-raised text-zinc-400 border border-bb-border"
                }`}
              >
                {val}%
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-bb-border bg-bb-surface p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
            <Zap className="h-3.5 w-3.5" /> Quick Buy Amounts (SOL)
          </div>
          <div className="flex gap-2 flex-wrap">
            {prefs.quickBuyAmounts.map((amt, i) => (
              <input
                key={i}
                type="number"
                step="0.05"
                value={amt}
                onChange={(e) => {
                  const next = [...prefs.quickBuyAmounts];
                  next[i] = parseFloat(e.target.value) || 0;
                  save({ ...prefs, quickBuyAmounts: next });
                }}
                className="w-20 h-11 bg-bb-raised border border-bb-border rounded-xl px-2 text-base text-white text-center tabular-nums focus:outline-none focus:border-bb-accent"
              />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-bb-border bg-bb-surface overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-bb-border">
            <div>
              <p className="text-[15px] text-white">Confirm Before Trade</p>
              <p className="text-xs text-zinc-400">Ask for confirmation before every swap</p>
            </div>
            <button
              onClick={() => save({ ...prefs, confirmBeforeTrade: !prefs.confirmBeforeTrade })}
              className={`w-12 h-7 shrink-0 flex items-center rounded-full p-0.5 transition-colors ${
                prefs.confirmBeforeTrade ? "bg-bb-up justify-end" : "bg-bb-raised border border-bb-border justify-start"
              }`}
            >
              <span className="w-6 h-6 bg-white rounded-full shadow" />
            </button>
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <div>
              <p className="text-[15px] text-white">MEV Protection by Default</p>
              <p className="text-xs text-zinc-400">Route new swaps through Jito by default</p>
            </div>
            <button
              onClick={() => save({ ...prefs, mevProtectionDefault: !prefs.mevProtectionDefault })}
              className={`w-12 h-7 shrink-0 flex items-center rounded-full p-0.5 transition-colors ${
                prefs.mevProtectionDefault ? "bg-bb-up justify-end" : "bg-bb-raised border border-bb-border justify-start"
              }`}
            >
              <span className="w-6 h-6 bg-white rounded-full shadow" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
