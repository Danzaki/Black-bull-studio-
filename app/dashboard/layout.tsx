import React from 'react';
import Sidebar from '@/components/layout/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black text-zinc-100 lg:flex">
      <aside className="hidden lg:block lg:w-72 lg:shrink-0">
        <Sidebar />
      </aside>

      <div className="min-w-0 flex-1">
        {children}
      </div>
    </div>
  );
}
