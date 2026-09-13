"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, SlidersHorizontal, Zap } from "lucide-react";

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
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-mono">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-zinc-900/80 bg-black/90 backdrop-blur-xl px-4 py-3.5">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-sm font-bold text-white">Trading Preferences</h1>
        </div>
        {saved && <span className="text-[10px] text-emerald-400 font-bold">Saved</span>}
      </header>

      <div className="p-4 space-y-4">
        <div className="rounded-xl border border-zinc-900 bg-zinc-950/60 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
            <SlidersHorizontal className="h-3.5 w-3.5" /> Default Slippage
          </div>
          <div className="flex gap-2">
            {[5, 10, 15, 25].map((val) => (
              <button
                key={val}
                onClick={() => save({ ...prefs, defaultSlippage: val })}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                  prefs.defaultSlippage === val
                    ? "bg-emerald-500 text-black"
                    : "bg-zinc-900 text-zinc-400 border border-zinc-800"
                }`}
              >
                {val}%
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-900 bg-zinc-950/60 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
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
                className="w-16 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white text-center"
              />
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-900 bg-zinc-950/60 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-900">
            <div>
              <p className="text-sm text-white">Confirm Before Trade</p>
              <p className="text-[10px] text-zinc-500">Ask for confirmation before every swap</p>
            </div>
            <button
              onClick={() => save({ ...prefs, confirmBeforeTrade: !prefs.confirmBeforeTrade })}
              className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                prefs.confirmBeforeTrade ? "bg-emerald-500 justify-end" : "bg-zinc-800 justify-start"
              }`}
            >
              <span className="w-4 h-4 bg-black rounded-full shadow" />
            </button>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5">
            <div>
              <p className="text-sm text-white">MEV Protection by Default</p>
              <p className="text-[10px] text-zinc-500">Route new swaps through Jito by default</p>
            </div>
            <button
              onClick={() => save({ ...prefs, mevProtectionDefault: !prefs.mevProtectionDefault })}
              className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                prefs.mevProtectionDefault ? "bg-emerald-500 justify-end" : "bg-zinc-800 justify-start"
              }`}
            >
              <span className="w-4 h-4 bg-black rounded-full shadow" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
