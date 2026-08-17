'use client';
import React from 'react';
import Feed from '@/components/feed/Feed';

export default function DashboardPage() {
  return (
    <div className="w-full min-h-screen bg-black text-zinc-100">
      <Feed />
    </div>
  );
}
