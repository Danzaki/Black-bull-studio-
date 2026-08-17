'use client';
import React from 'react';
import { Search } from 'lucide-react';

export default function Widgets() {
  return (
    <aside className="w-80 min-h-screen border-l border-zinc-800/80 p-4 hidden lg:block sticky top-0 h-screen space-y-4">
      <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-3 py-2 text-xs text-zinc-400">
        <Search className="w-4 h-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search..."
          className="bg-transparent border-none outline-none text-zinc-100 placeholder-zinc-500 w-full"
        />
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 space-y-3">
        <h2 className="text-sm font-bold text-zinc-100">Trending Topics</h2>
        <div className="space-y-2 text-xs">
          <div>
            <span className="text-zinc-500">Ecosystem • Trending</span>
            <p className="font-semibold text-zinc-200">#BlackBullStudio</p>
          </div>
          <div>
            <span className="text-zinc-500">Web3 • Trending</span>
            <p className="font-semibold text-zinc-200">#Nextjs15</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
