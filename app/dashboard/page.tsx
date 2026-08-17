'use client';
import React from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Widgets from '@/components/layout/Widgets';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-black text-zinc-100 flex justify-center">
      <div className="flex w-full max-w-7xl">
        <Sidebar />
        <main className="flex-1 min-w-0 p-6 border-x border-zinc-800/80">
          <h1 className="text-xl font-bold text-white mb-2">Dashboard Overview</h1>
          <p className="text-xs text-zinc-400">Welcome to your Black Bull Studio dashboard.</p>
        </main>
        <Widgets />
      </div>
    </div>
  );
}
