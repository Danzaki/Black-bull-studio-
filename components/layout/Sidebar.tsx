'use client';
import React from 'react';

export default function Sidebar() {
  const menuItems = [
    { icon: '🏠', label: 'Feed', active: true },
    { icon: '🏆', label: 'Challenges', active: false },
    { icon: '🪄', label: 'AI Meme Lab', active: false },
    { icon: '📊', label: 'Analytics', active: false },
    { icon: '👤', label: 'Profile', active: false },
  ];

  return (
    <aside className="w-64 hidden md:flex flex-col h-screen sticky top-0 border-r border-zinc-800/80 bg-zinc-950/60 p-4 backdrop-blur-xl">
      {/* Logo Section */}
      <div className="flex items-center gap-3 px-3 py-4 mb-6">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-yellow-500 to-amber-300 flex items-center justify-center text-black font-black text-xl shadow-lg shadow-yellow-500/10">
          🐂
        </div>
        <div>
          <h1 className="font-extrabold text-white tracking-wide text-base">$ANSEM</h1>
          <p className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider">Ecosystem Studio</p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="space-y-1.5 flex-1">
        {menuItems.map((item, idx) => (
          <button
            key={idx}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95 ${
              item.active
                ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 shadow-sm'
                : 'text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-200'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Bull Stat Card at Bottom */}
      <div className="p-3.5 rounded-2xl border border-zinc-800/80 bg-black/60 backdrop-blur-md">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-zinc-400 font-medium">$ANSEM Price</span>
          <span className="text-emerald-400 font-bold">+12.4%</span>
        </div>
        <div className="text-lg font-black text-white">$0.0425</div>
      </div>
    </aside>
  );
}
