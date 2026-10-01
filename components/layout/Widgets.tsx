'use client';

import React from 'react';
import { Search } from 'lucide-react';

export default function Widgets() {
  return (
    <aside className="sticky top-0 hidden h-screen min-h-screen w-80 space-y-4 border-l border-stone-900/10 p-4 lg:block">
      <div className="flex items-center gap-2 rounded-full border border-stone-900/10 bg-stone-900/[0.05] px-3 py-2 text-xs text-stone-500 transition-all duration-200 focus-within:border-[#f97316]/40 focus-within:bg-stone-900/[0.06]">
        <Search className="h-4 w-4 text-stone-500" />
        <input
          type="text"
          placeholder="Search..."
          className="w-full border-none bg-transparent text-stone-900 outline-none placeholder:text-stone-400"
        />
      </div>

      <div className="space-y-3 rounded-2xl border border-stone-900/10 bg-stone-900/[0.05] p-4">
        <h2 className="text-sm font-bold text-stone-900">Trending Topics</h2>
        <div className="space-y-1 text-xs">
          <div className="-mx-2 cursor-pointer rounded-xl px-2 py-2 transition-colors duration-200 hover:bg-stone-900/[0.06]">
            <span className="text-stone-500">Ecosystem • Trending</span>
            <p className="font-semibold text-stone-900">#BlackBullStudio</p>
          </div>
          <div className="-mx-2 cursor-pointer rounded-xl px-2 py-2 transition-colors duration-200 hover:bg-stone-900/[0.06]">
            <span className="text-stone-500">Web3 • Trending</span>
            <p className="font-semibold text-stone-900">#Nextjs15</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
