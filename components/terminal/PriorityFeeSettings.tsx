"use client";

import React, { useEffect, useState } from "react";
import { Fuel, Zap, Sliders, ShieldCheck } from "lucide-react";
import { PriorityFeeConfig, FeePreset } from "@/types/gas";

const PRESETS: { label: FeePreset; priority: number; jito: number; color: string }[] = [
  { label: "DEFAULT", priority: 0.0001, jito: 0.001, color: "text-zinc-400 border-bb-border" },
  { label: "FAST", priority: 0.001, jito: 0.002, color: "text-bb-up border-bb-up/30" },
  { label: "TURBO", priority: 0.003, jito: 0.005, color: "text-amber-400 border-amber-500/30" },
  { label: "ULTRA", priority: 0.01, jito: 0.02, color: "text-bb-down border-bb-down/30" },
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
    <div className="rounded-2xl border border-bb-border bg-bb-surface p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-bb-border pb-2">
        <div className="flex items-center gap-2">
          <Fuel className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-white">Priority Fee & Gas Settings</h3>
        </div>
        <span className="text-xs text-bb-up flex items-center gap-1">
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
              className={`min-h-[56px] p-2 rounded-xl border text-center transition-all active:scale-95 ${
                isActive
                  ? "bg-bb-raised border-bb-accent text-white font-semibold"
                  : "bg-bb-surface border-bb-border text-zinc-400 hover:text-white"
              }`}
            >
              <div className="text-xs font-semibold">{p.label}</div>
              <div className={`text-[11px] mt-0.5 ${p.color}`}>{p.priority} SOL</div>
            </button>
          );
        })}
      </div>

      {/* Fee Breakdown Inputs */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="bg-bb-raised p-3 rounded-xl border border-bb-border space-y-1.5">
          <label className="text-xs text-zinc-400 block">Priority Fee (SOL)</label>
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
            className="w-full h-11 bg-bb-surface border border-bb-border rounded-lg px-2.5 text-base text-white tabular-nums focus:outline-none focus:border-bb-accent"
          />
        </div>

        <div className="bg-bb-raised p-3 rounded-xl border border-bb-border space-y-1.5">
          <label className="text-xs text-zinc-400 block">Jito Tip (SOL)</label>
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
            className="w-full h-11 bg-bb-surface border border-bb-border rounded-lg px-2.5 text-base text-white tabular-nums focus:outline-none focus:border-bb-accent"
          />
        </div>
      </div>

      {/* Dynamic Adjustment Switch */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-bb-raised border border-bb-border text-sm">
        <div className="flex items-center gap-2 text-zinc-300">
          <Sliders className="h-3.5 w-3.5 text-bb-accent" />
          <span>Auto-adjust fee during congestion</span>
        </div>
        <input
          type="checkbox"
          checked={config.autoFeeAdjustment}
          onChange={(e) => setConfig({ ...config, autoFeeAdjustment: e.target.checked })}
          className="rounded bg-bb-surface border-bb-border text-emerald-500 focus:ring-0 h-6 w-6 shrink-0 cursor-pointer"
        />
      </div>
    </div>
  );
}
