'use client';
import React from 'react';
import Sidebar from '@/components/layout/Sidebar';
import NotificationToggle from '@/components/NotificationToggle';

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-[#f7f5f2] text-stone-100 flex justify-center">
      <div className="flex w-full max-w-7xl">
        <Sidebar />
        <main className="flex-1 min-w-0 border-x border-stone-800/80 min-h-screen p-4">
          <h1 className="text-lg font-bold border-b border-stone-800/80 pb-4">Settings</h1>
          <p className="text-xs text-stone-500 mt-4">Account settings and preferences.</p>
          <div className="mt-4"><NotificationToggle /></div>
        </main>
      </div>
    </div>
  );
}
