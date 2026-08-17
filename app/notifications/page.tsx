'use client';
import React from 'react';
import Sidebar from '@/components/layout/Sidebar';

export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-black text-zinc-100 flex justify-center">
      <div className="flex w-full max-w-7xl">
        <Sidebar />
        <main className="flex-1 min-w-0 border-x border-zinc-800/80 min-h-screen p-4">
          <h1 className="text-lg font-bold border-b border-zinc-800/80 pb-4">Notifications</h1>
          <p className="text-xs text-zinc-500 mt-4">No new notifications.</p>
        </main>
      </div>
    </div>
  );
}
