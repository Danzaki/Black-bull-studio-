"use client";

import React, { useState } from "react";
import {
  Home,
  TrendingUp,
  BrainCircuit,
  Crosshair,
  Wallet,
  ChevronRight,
  Activity
} from "lucide-react";
import { MainTab } from "@/types/navigation";

interface TerminalLayoutProps {
  children: React.ReactNode;
  activeTab: MainTab;
  setActiveTab: (tab: MainTab) => void;
  subTabsNav: React.ReactNode;
}

export default function TerminalLayout({ children, activeTab, setActiveTab, subTabsNav }: TerminalLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { id: "home", label: "HOME", shortLabel: "Home", icon: Home },
    { id: "market", label: "MARKET & TRADE", shortLabel: "Market", icon: TrendingUp },
    { id: "smartmoney", label: "SMART MONEY", shortLabel: "Smart", icon: BrainCircuit },
    { id: "sniper", label: "AUTO-SNIPER & MEV", shortLabel: "Sniper", icon: Crosshair },
    { id: "wallet", label: "WALLETS & POSITIONS", shortLabel: "Wallet", icon: Wallet },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 flex flex-col md:flex-row font-mono antialiased selection:bg-emerald-500 selection:text-black">
      {/* Primary Sidebar Navigation — Desktop only */}
      <aside className={`hidden md:flex border-r border-zinc-900 bg-black flex-col justify-between transition-all duration-300 ${collapsed ? "w-16" : "w-60"} p-3 shrink-0`}>
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
            {!collapsed && (
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-xs">
                  BB
                </div>
                <span className="text-xs font-black tracking-widest text-white">BLACK BULL</span>
              </div>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1 rounded bg-zinc-900 text-zinc-400 hover:text-white text-xs"
            >
              <ChevronRight className={`h-4 w-4 transition-transform ${collapsed ? "" : "rotate-180"}`} />
            </button>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as MainTab)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${
                    isActive
                      ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="tracking-wider">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {!collapsed && (
          <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-900 text-[10px] space-y-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="flex items-center gap-1"><Activity className="h-3 w-3 text-emerald-400 animate-pulse" /> RPC SOLANA</span>
              <span className="text-emerald-400 font-bold">100% ONLINE</span>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full max-w-full">
        <header className="border-b border-zinc-900 bg-black/80 backdrop-blur-md px-4 py-2.5 flex items-center justify-between gap-4 sticky top-0 z-40">
          <div className="flex-1 overflow-x-auto no-scrollbar">
            {subTabsNav}
          </div>
        </header>

        <main className="flex-1 p-4 overflow-y-auto space-y-4 pb-24 md:pb-4 w-full max-w-full">
          {children}
        </main>
      </div>

      {/* Bottom Navigation — Mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-900 bg-black/95 backdrop-blur-lg">
        <div className="flex items-center justify-around w-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as MainTab)}
                className={`flex flex-col items-center gap-1 py-2.5 px-2 flex-1 transition-colors ${
                  isActive ? "text-emerald-400" : "text-zinc-500"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[9px] font-bold tracking-wide">{item.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
