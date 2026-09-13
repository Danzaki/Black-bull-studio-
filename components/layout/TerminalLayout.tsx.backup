"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Home,
  Menu,
  Search,
  Wallet,
  X,
  Zap,
  MoreVertical,
  Settings,
  Bell,
  ShieldCheck,
  SlidersHorizontal,
  Palette,
  Info,
} from "lucide-react";
import { MainTab } from "@/types/navigation";

const MORE_MENU_ITEMS = [
  { label: "Settings", href: "/terminal/settings", icon: Settings },
  { label: "Alerts", href: "/terminal/notifications", icon: Bell },
  { label: "Security", href: "/terminal/security", icon: ShieldCheck },
  { label: "Trading Preferences", href: "/terminal/preferences", icon: SlidersHorizontal },
  { label: "Appearance", href: "/terminal/appearance", icon: Palette },
  { label: "About Black Bull", href: "/terminal/about", icon: Info },
];

interface TerminalLayoutProps {
  children: React.ReactNode;
  activeTab: MainTab;
  setActiveTab: (tab: MainTab) => void;
  subTabsNav: React.ReactNode;
}

const navItems = [
  {
    id: "home",
    label: "Overview",
    mobileLabel: "Home",
    icon: Home,
  },
  {
    id: "market",
    label: "Market",
    mobileLabel: "Trade",
    icon: Activity,
  },
  {
    id: "smartmoney",
    label: "Smart Money",
    mobileLabel: "Smart",
    icon: BrainCircuit,
  },
  {
    id: "sniper",
    label: "Sniper & MEV",
    mobileLabel: "Sniper",
    icon: Crosshair,
  },
  {
    id: "wallet",
    label: "Wallets",
    mobileLabel: "Wallet",
    icon: Wallet,
  },
] as const;

export default function TerminalLayout({
  children,
  activeTab,
  setActiveTab,
  subTabsNav,
}: TerminalLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeItem =
    navItems.find((item) => item.id === activeTab) ?? navItems[0];

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 antialiased selection:bg-emerald-400 selection:text-black">
      <div className="flex min-h-screen">
        {/* Desktop navigation */}
        <aside
          className={[
            "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-zinc-900 bg-[#070707] md:flex",
            "transition-[width] duration-200",
            collapsed ? "w-[68px]" : "w-[232px]",
          ].join(" ")}
        >
          {/* Brand */}
          <div
            className={[
              "flex h-16 shrink-0 items-center border-b border-zinc-900",
              collapsed ? "justify-center px-2" : "justify-between px-4",
            ].join(" ")}
          >
            <button
              type="button"
              onClick={() => setActiveTab("home")}
              className="flex min-w-0 items-center gap-3"
              aria-label="Black Bull Studio home"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-[10px] font-black tracking-tight text-white">
                BB
              </span>

              {!collapsed && (
                <span className="min-w-0 text-left">
                  <span className="block truncate text-[12px] font-black tracking-[0.18em] text-white">
                    BLACK BULL
                  </span>
                  <span className="mt-0.5 block text-[9px] font-medium uppercase tracking-[0.16em] text-zinc-600">
                    Solana Terminal
                  </span>
                </span>
              )}
            </button>

            {!collapsed && (
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
          </div>

          {collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="mx-auto mt-4 rounded-lg p-2 text-zinc-600 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-2 py-5">
            <div
              className={[
                "mb-3 px-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-700",
                collapsed ? "sr-only" : "",
              ].join(" ")}
            >
              Terminal
            </div>

            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id as MainTab)}
                    title={collapsed ? item.label : undefined}
                    className={[
                      "group relative flex w-full items-center rounded-xl transition-all duration-150",
                      collapsed
                        ? "justify-center px-2 py-3"
                        : "gap-3 px-3 py-2.5",
                      isActive
                        ? "bg-zinc-900 text-white"
                        : "text-zinc-500 hover:bg-zinc-900/60 hover:text-zinc-200",
                    ].join(" ")}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-emerald-400" />
                    )}

                    <Icon
                      className={[
                        "h-[17px] w-[17px] shrink-0",
                        isActive
                          ? "text-emerald-400"
                          : "text-zinc-600 group-hover:text-zinc-300",
                      ].join(" ")}
                    />

                    {!collapsed && (
                      <span className="text-[11px] font-semibold tracking-wide">
                        {item.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Footer */}
          <div className="border-t border-zinc-900 p-3">
            <div
              className={[
                "flex items-center rounded-xl border border-zinc-900 bg-[#0a0a0a]",
                collapsed
                  ? "justify-center p-2"
                  : "justify-between px-3 py-2.5",
              ].join(" ")}
            >
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/40" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>

                {!collapsed && (
                  <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-zinc-500">
                    Solana
                  </span>
                )}
              </div>

              {!collapsed && (
                <Zap className="h-3.5 w-3.5 text-zinc-700" />
              )}
            </div>
          </div>
        </aside>

        {/* Main terminal */}
        <section className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header className="sticky top-0 z-40 border-b border-zinc-900 bg-[#050505]/95 backdrop-blur-xl">
            <div className="flex h-14 items-center gap-3 px-3 sm:px-4 lg:px-5">
              {/* Mobile menu */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-900 hover:text-white md:hidden"
                aria-label="Open terminal navigation"
              >
                <Menu className="h-5 w-5" />
              </button>

              {/* Current section */}
              <div className="hidden min-w-0 items-center gap-2 sm:flex">
                <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-600">
                  Terminal
                </span>
                <ChevronRight className="h-3 w-3 text-zinc-800" />
                <span className="truncate text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-300">
                  {activeItem.label}
                </span>
              </div>

              {/* Search */}
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/terminal/search";
                }}
                className="ml-auto flex h-9 min-w-0 items-center gap-2 rounded-lg border border-zinc-900 bg-[#090909] px-3 text-zinc-600 transition-colors hover:border-zinc-800 hover:text-zinc-300 sm:ml-4 sm:w-64"
                aria-label="Search Solana tokens"
              >
                <Search className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate text-[10px] font-medium tracking-wide">
                  Search token or mint
                </span>
                <span className="ml-auto hidden rounded border border-zinc-800 px-1.5 py-0.5 text-[8px] text-zinc-700 sm:block">
                  /
                </span>
              </button>

              {/* Solana indicator */}
              <div className="hidden items-center gap-2 rounded-lg border border-zinc-900 bg-[#090909] px-3 py-2 lg:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                  Solana Mainnet
                </span>
              </div>

              {/* More menu */}
              <div className="relative" ref={moreMenuRef}>
                <button
                  type="button"
                  onClick={() => setMoreMenuOpen((prev) => !prev)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-900 bg-[#090909] text-zinc-500 hover:border-zinc-800 hover:text-zinc-300 transition-colors"
                  aria-label="More options"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>

                {moreMenuOpen && (
                  <div className="absolute right-0 top-11 z-50 w-56 rounded-xl border border-zinc-900 bg-[#0a0a0a] shadow-2xl overflow-hidden">
                    {MORE_MENU_ITEMS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.href}
                          onClick={() => {
                            setMoreMenuOpen(false);
                            router.push(item.href);
                          }}
                          className="flex items-center gap-3 w-full px-3.5 py-2.5 text-left text-[11px] font-semibold text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors"
                        >
                          <Icon className="h-4 w-4 text-zinc-600" />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Sub navigation */}
            {subTabsNav && (
              <div className="border-t border-zinc-900/80 bg-[#070707]">
                <div className="overflow-x-auto px-3 py-2 no-scrollbar sm:px-4 lg:px-5">
                  {subTabsNav}
                </div>
              </div>
            )}
          </header>

          {/* Content */}
          <main className="min-w-0 flex-1 overflow-x-hidden px-3 py-4 pb-24 sm:px-4 lg:px-5 lg:py-5 md:pb-5">
            {children}
          </main>
        </section>
      </div>

      {/* Mobile navigation drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[70] md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-black/70"
            aria-label="Close navigation"
          />

          <aside className="relative flex h-full w-[280px] flex-col border-r border-zinc-900 bg-[#070707] shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-zinc-900 px-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-[10px] font-black text-white">
                  BB
                </span>
                <div>
                  <div className="text-[12px] font-black tracking-[0.16em] text-white">
                    BLACK BULL
                  </div>
                  <div className="text-[9px] uppercase tracking-[0.15em] text-zinc-600">
                    Solana Terminal
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-900 hover:text-white"
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="flex-1 p-3">
              <div className="mb-3 px-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-700">
                Terminal
              </div>

              <div className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id as MainTab);
                        setMobileMenuOpen(false);
                      }}
                      className={[
                        "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left",
                        isActive
                          ? "bg-zinc-900 text-white"
                          : "text-zinc-500 hover:bg-zinc-900/60 hover:text-zinc-200",
                      ].join(" ")}
                    >
                      <Icon
                        className={[
                          "h-4 w-4",
                          isActive ? "text-emerald-400" : "text-zinc-600",
                        ].join(" ")}
                      />
                      <span className="text-[11px] font-semibold tracking-wide">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </nav>

            <div className="border-t border-zinc-900 p-4">
              <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.15em] text-zinc-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Solana Mainnet
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-900 bg-[#070707]/95 backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id as MainTab)}
                className={[
                  "relative flex min-h-[58px] flex-col items-center justify-center gap-1",
                  isActive ? "text-white" : "text-zinc-600",
                ].join(" ")}
              >
                {isActive && (
                  <span className="absolute top-0 h-[2px] w-8 rounded-full bg-emerald-400" />
                )}

                <Icon
                  className={[
                    "h-[17px] w-[17px]",
                    isActive ? "text-emerald-400" : "text-zinc-600",
                  ].join(" ")}
                />

                <span className="text-[8px] font-bold uppercase tracking-wide">
                  {item.mobileLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
