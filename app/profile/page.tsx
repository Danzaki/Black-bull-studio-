'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Widgets from '@/components/layout/Widgets';
import { getSupabaseClient } from '@/lib/supabaseClient';
import type { Profile } from '@/types/community';

function ProfileContent() {
  const searchParams = useSearchParams();
  const userIdParam = searchParams.get('id');

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();

    async function fetchProfile() {
      setLoading(true);
      let targetId = userIdParam;

      if (!targetId) {
        const { data: { user } } = await supabase.auth.getUser();
        targetId = user?.id ?? null;
      }

      if (targetId) {
        const { data } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, verified')
          .eq('id', targetId)
          .maybeSingle();

        if (data) setProfile(data);
      }
      setLoading(false);
    }

    void fetchProfile();
  }, [userIdParam]);

  const displayName = profile?.display_name || profile?.username || 'User';
  const username = profile?.username || 'user';
  const avatar = profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=f5b942&color=000000&bold=true`;

  if (loading) {
    return (
      <div className="p-6 animate-pulse space-y-4">
        <div className="h-20 w-20 rounded-full bg-zinc-800" />
        <div className="h-4 w-32 bg-zinc-800 rounded" />
        <div className="h-3 w-24 bg-zinc-800 rounded" />
      </div>
    );
  }

  if (!profile) {
    return <p className="p-6 text-sm text-zinc-500">User profile not found.</p>;
  }

  return (
    <div className="p-6">
      <div className="h-20 w-20 rounded-full overflow-hidden border border-zinc-700">
        <img src={avatar} alt={displayName} className="h-full w-full object-cover" />
      </div>
      <h2 className="mt-4 text-base font-bold text-zinc-100 flex items-center gap-1">
        {displayName}
        {profile.verified && <span className="text-amber-400 text-xs">✓</span>}
      </h2>
      <p className="text-xs text-zinc-500">@{username}</p>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-black text-zinc-100 flex justify-center">
      <div className="flex w-full max-w-7xl">
        <Sidebar />
        <main className="flex-1 min-w-0 border-x border-zinc-800/80 min-h-screen">
          <div className="p-4 border-b border-zinc-800/80">
            <h1 className="text-lg font-bold">User Profile</h1>
          </div>
          <Suspense fallback={
            <div className="p-6 animate-pulse space-y-4">
              <div className="h-20 w-20 rounded-full bg-zinc-800" />
              <div className="h-4 w-32 bg-zinc-800 rounded" />
              <div className="h-3 w-24 bg-zinc-800 rounded" />
            </div>
          }>
            <ProfileContent />
          </Suspense>
        </main>
        <Widgets />
      </div>
    </div>
  );
}
