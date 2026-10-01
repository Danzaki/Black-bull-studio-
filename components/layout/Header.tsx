'use client';

import React from 'react';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 flex w-full items-center justify-between border-b border-stone-900/10 bg-[#f7f5f2]/80 px-4 py-3 backdrop-blur-xl">
      <div className="flex items-center gap-2 md:hidden">
        <span className="text-2xl">🐂</span>
        <span className="text-base font-extrabold tracking-wider text-stone-900">BLACK BULL</span>
      </div>

      <div className="hidden md:block">
        <h2 className="text-sm font-bold text-stone-900">Black Bull Studio</h2>
        <p className="text-xs text-stone-500">Welcome back to the studio</p>
      </div>

      <div className="flex items-center gap-3">
        <button className="rounded-full bg-[#f97316] px-4 py-2 text-xs font-bold text-black shadow-md shadow-[#f97316]/10 transition-all duration-200 hover:bg-[#f97316]/90 active:scale-95">
          + New Post
        </button>
        <div className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-stone-900/10 bg-stone-900/[0.06] text-xs font-bold text-[#f97316] transition-all duration-200 hover:bg-stone-900/5 active:scale-90">
          🐂
        </div>
      </div>
    </header>
  );
}
