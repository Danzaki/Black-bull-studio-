"use client";

import React, { useEffect, useState } from "react";
import { Fuel, Zap, Sliders, ShieldCheck } from "lucide-react";
import { PriorityFeeConfig, FeePreset } from "@/types/gas";

const PRESETS: { label: FeePreset; priority: number; jito: number; color: string }[] = [
  { label: "DEFAULT", priority: 0.0001, jito: 0.001, color: "text-zinc-400 border-zinc-800" },
  { label: "FAST", priority: 0.001, jito: 0.002, color: "text-emerald-400 border-emerald-500/30" },
  { label: "TURBO", priority: 0.003, jito: 0.005, color: "text-amber-400 border-amber-500/30" },
  { label: "ULTRA", priority: 0.01, jito: 0.02, color: "text-rose-400 border-rose-500/30" },
];

export default function PriorityFeeSettings() {
  const [config, setConfig] = useState<PriorityFeeConfig>({
    preset: "TURBO",
    priorityFeeSOL: 0.003,
    jitoTipSOL: 0.005,
    maxComputeUnits: 200000,
    autoFeeAdjustment: true,
  });

  const handleSelectPreset = (p: typeof PRESETS[0]) => {
    setConfig((prev) => ({
      ...prev,
      preset: p.label,
      priorityFeeSOL: p.priority,
      jitoTipSOL: p.jito,
    }));
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
        <div className="flex items-center gap-2">
          <Fuel className="h-4 w-4 text-amber-400" />
          <h3 className="text-xs font-bold text-white">Priority Fee & Gas Settings</h3>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
          <Zap className="h-3 w-3" /> Solana Network: Normal
        </span>
      </div>

      {/* Preset Buttons */}
      <div className="grid grid-cols-4 gap-2">
        {PRESETS.map((p) => {
          const isActive = config.preset === p.label;
          return (
            <button
              key={p.label}
              onClick={() => handleSelectPreset(p)}
              className={`p-2 rounded-lg border text-center transition-all ${
                isActive
                  ? "bg-zinc-900 border-emerald-500 text-white font-bold"
                  : "bg-zinc-900/20 border-zinc-900 text-zinc-400 hover:text-white"
              }`}
            >
              <div className="text-[10px] font-mono">{p.label}</div>
              <div className={`text-[9px] mt-0.5 ${p.color}`}>{p.priority} SOL</div>
            </button>
          );
        })}
      </div>

      {/* Fee Breakdown Inputs */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="bg-zinc-900/30 p-2.5 rounded-lg border border-zinc-900 space-y-1">
          <label className="text-[10px] text-zinc-400 block font-mono">Priority Fee (SOL)</label>
          <input
            type="number"
            step="0.001"
            value={config.priorityFeeSOL}
            onChange={(e) =>
              setConfig({
                ...config,
                preset: "CUSTOM",
                priorityFeeSOL: parseFloat(e.target.value) || 0,
              })
            }
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="bg-zinc-900/30 p-2.5 rounded-lg border border-zinc-900 space-y-1">
          <label className="text-[10px] text-zinc-400 block font-mono">Jito Tip (SOL)</label>
          <input
            type="number"
            step="0.001"
            value={config.jitoTipSOL}
            onChange={(e) =>
              setConfig({
                ...config,
                preset: "CUSTOM",
                jitoTipSOL: parseFloat(e.target.value) || 0,
              })
            }
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Dynamic Adjustment Switch */}
      <div className="flex items-center justify-between p-2 rounded bg-zinc-900/20 border border-zinc-900 text-[11px]">
        <div className="flex items-center gap-1.5 text-zinc-400 font-mono">
          <Sliders className="h-3.5 w-3.5 text-emerald-400" />
          <span>Auto-adjust fee during congestion</span>
        </div>
        <input
          type="checkbox"
          checked={config.autoFeeAdjustment}
          onChange={(e) => setConfig({ ...config, autoFeeAdjustment: e.target.checked })}
          className="rounded bg-zinc-950 border-zinc-800 text-emerald-500 focus:ring-0 h-3.5 w-3.5 cursor-pointer"
        />
      </div>
    </div>
  );
}
