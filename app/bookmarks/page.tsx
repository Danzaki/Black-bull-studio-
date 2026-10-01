'use client';

import React from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { Bookmark } from 'lucide-react';

export default function BookmarksPage() {
  return (
    <div className="flex min-h-screen justify-center bg-[#f7f5f2] text-stone-900">
      <div className="flex w-full max-w-7xl">
        <Sidebar />
        <main className="min-h-screen min-w-0 flex-1 border-x border-stone-900/10">
          <h1 className="sticky top-0 z-10 border-b border-stone-900/10 bg-[#f7f5f2]/80 px-4 py-4 text-lg font-bold backdrop-blur-xl">
            Bookmarks
          </h1>
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f97316]/10">
              <Bookmark className="h-6 w-6 text-[#f97316]" />
            </div>
            <p className="text-sm text-stone-500">No saved posts yet.</p>
          </div>
        </main>
      </div>
    </div>
  );
}
