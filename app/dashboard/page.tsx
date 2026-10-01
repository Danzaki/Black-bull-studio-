'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import {
  BarChart3,
  FileText,
  Heart,
  Users,
  PlusCircle,
  Clock,
  Trash2,
  Sparkles,
  Settings,
} from 'lucide-react';
import Link from 'next/link';

interface UserPost {
  id: string;
  content: string;
  like_count: number;
  created_at: string;
  category: string;
}

interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  bio?: string | null;
}

export default function DashboardPage() {
  const supabase = getSupabaseClient();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [myPosts, setMyPosts] = useState<UserPost[]>([]);
  const [totalLikes, setTotalLikes] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, bio')
      .eq('id', user.id)
      .single();

    if (profileData) {
      setProfile(profileData as UserProfile);
    }

    const { data: postsData } = await supabase
      .from('posts')
      .select('id, content, like_count, created_at, category')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (postsData) {
      const typedPosts = postsData as UserPost[];
      setMyPosts(typedPosts);

      const calculatedLikes = typedPosts.reduce(
        (sum, p) => sum + (p.like_count || 0),
        0
      );
      setTotalLikes(calculatedLikes);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void fetchDashboardData();
  }, [fetchDashboardData]);

  const handleDeletePost = async (postId: string) => {
    setMyPosts((prev) => prev.filter((p) => p.id !== postId));
    await supabase.from('posts').delete().eq('id', postId);
  };

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-sm text-white/40">
        <Sparkles className="h-6 w-6 animate-pulse text-[#f5b942]" />
        <span>Loading Studio Analytics...</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 pb-24">
      {/* Profile Overview Banner */}
      <div className="mb-6 rounded-2xl border border-white/10 bg-gradient-to-r from-neutral-900 via-neutral-950 to-black p-5 backdrop-blur-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="h-12 w-12 rounded-full border border-[#f5b942]/40 object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f5b942] text-base font-bold text-black">
                {profile?.display_name ? profile.display_name[0].toUpperCase() : 'U'}
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold text-white">
                {profile?.display_name || 'Studio Creator'}
              </h1>
              <p className="text-xs text-white/40">@{profile?.username || 'user'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/profile/edit"
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white transition"
            >
              <Settings className="h-3.5 w-3.5 text-[#f5b942]" />
              <span>Edit Profile</span>
            </Link>

            <Link
              href="/community"
              className="flex items-center gap-1.5 rounded-full border border-[#f5b942] bg-[#f5b942]/10 px-4 py-2 text-xs font-semibold text-[#f5b942] hover:bg-[#f5b942] hover:text-black transition"
            >
              <PlusCircle className="h-4 w-4" />
              <span>New Post</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Analytics KPI Cards Grid */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-neutral-900/50 p-4 backdrop-blur-md">
          <div className="mb-2 flex items-center justify-between text-white/40">
            <span className="text-[10px] font-bold uppercase tracking-wider">Creations</span>
            <FileText className="h-4 w-4 text-[#f5b942]" />
          </div>
          <div className="text-2xl font-black text-white">{myPosts.length}</div>
          <div className="text-[10px] text-white/40">Total published</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-neutral-900/50 p-4 backdrop-blur-md">
          <div className="mb-2 flex items-center justify-between text-white/40">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Likes</span>
            <Heart className="h-4 w-4 text-red-500" />
          </div>
          <div className="text-2xl font-black text-white">{totalLikes}</div>
          <div className="text-[10px] text-white/40">Earned reactions</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-neutral-900/50 p-4 backdrop-blur-md">
          <div className="mb-2 flex items-center justify-between text-white/40">
            <span className="text-[10px] font-bold uppercase tracking-wider">Community</span>
            <Users className="h-4 w-4 text-[#f5b942]" />
          </div>
          <div className="text-2xl font-black text-white">1</div>
          <div className="text-[10px] text-white/40">Active network</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-neutral-900/50 p-4 backdrop-blur-md">
          <div className="mb-2 flex items-center justify-between text-white/40">
            <span className="text-[10px] font-bold uppercase tracking-wider">Performance</span>
            <BarChart3 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">100%</div>
          <div className="text-[10px] text-emerald-400">Optimal status</div>
        </div>
      </div>

      {/* Active Studio Content Management */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Clock className="h-4 w-4 text-[#f5b942]" />
          <span>My Published Content</span>
        </h2>

        {myPosts.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-10 text-center text-xs text-white/40">
            You have not published any creations yet. Use the New Post button to get started!
          </div>
        ) : (
          <div className="space-y-3">
            {myPosts.map((post) => (
              <div
                key={post.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-neutral-900/40 p-4 backdrop-blur-sm transition hover:border-white/20"
              >
                <div className="flex-1 pr-4">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-medium text-[#f5b942]">
                      {post.category || 'General'}
                    </span>
                    <span className="text-[10px] text-white/40">
                      {new Date(post.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-white/80 line-clamp-2">{post.content}</p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-xs text-white/50">
                    <Heart className="h-3.5 w-3.5 text-red-500 fill-red-500/20" />
                    <span>{post.like_count || 0}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleDeletePost(post.id)}
                    className="text-white/30 hover:text-red-400 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
