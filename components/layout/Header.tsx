'use client';
import React from 'react';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-black/60 backdrop-blur-xl px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2 md:hidden">
        <span className="text-2xl">🐂</span>
        <span className="font-extrabold text-white text-base">$ANSEM</span>
      </div>

      <div className="hidden md:block">
        <h2 className="text-sm font-bold text-white">Community Dashboard</h2>
        <p className="text-xs text-zinc-500">Welcome back to the Bull Pen</p>
      </div>

      <div className="flex items-center gap-3">
        <button className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xs px-4 py-2 rounded-full transition active:scale-95 shadow-md shadow-yellow-500/10">
          + New Post
        </button>
        <div className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-yellow-400 cursor-pointer">
          🐂
        </div>
      </div>
    </header>
  );
}
