'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import {
  Eye,
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
  views_count: number | null;
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
  const [totalViews, setTotalViews] = useState<number>(0);
  const [followersCount, setFollowersCount] = useState<number>(0);
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
      .select('id, content, like_count, views_count, created_at, category')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (postsData) {
      const typedPosts = postsData as UserPost[];
      setMyPosts(typedPosts);

      setTotalLikes(typedPosts.reduce((sum, p) => sum + (p.like_count || 0), 0));
      setTotalViews(typedPosts.reduce((sum, p) => sum + (p.views_count || 0), 0));
    }

    const { count: followers } = await supabase
      .from('follows')
      .select('follower_id', { count: 'exact', head: true })
      .eq('following_id', user.id);

    setFollowersCount(followers ?? 0);

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void fetchDashboardData();
  }, [fetchDashboardData]);

  const handleDeletePost = async (postId: string) => {
    const confirmed = window.confirm('Delete this post? This cannot be undone.');
    if (!confirmed) return;

    setMyPosts((prev) => prev.filter((p) => p.id !== postId));
    const { error } = await supabase.from('posts').delete().eq('id', postId);

    if (error) {
      alert('Error deleting: ' + error.message);
      void fetchDashboardData();
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-sm text-stone-500">
        <Sparkles className="h-6 w-6 animate-pulse text-[#f97316]" />
        <span className="animate-pulse">Loading Studio Analytics...</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 pb-24">
      {/* Profile Overview Banner */}
      <div className="mb-6 rounded-2xl border border-stone-900/10 bg-gradient-to-r from-stone-100 via-white to-[#f7f5f2] p-5 backdrop-blur-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="h-12 w-12 rounded-full border border-[#f97316]/40 object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f97316] text-base font-bold text-black">
                {profile?.display_name ? profile.display_name[0].toUpperCase() : 'U'}
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold text-stone-900">
                {profile?.display_name || 'Studio Creator'}
              </h1>
              <p className="text-xs text-stone-500">@{profile?.username || 'user'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/profile/edit"
              className="flex items-center gap-1.5 rounded-full border border-stone-900/10 bg-stone-900/4 px-3.5 py-2 text-xs font-semibold text-stone-800 transition-all duration-200 hover:bg-stone-900/5 hover:text-stone-900 active:scale-95"
            >
              <Settings className="h-3.5 w-3.5 text-[#f97316]" />
              <span>Edit Profile</span>
            </Link>

            <Link
              href="/community"
              className="flex items-center gap-1.5 rounded-full border border-[#f97316] bg-[#f97316]/10 px-4 py-2 text-xs font-semibold text-[#f97316] transition-all duration-200 hover:bg-[#f97316] hover:text-black active:scale-95"
            >
              <PlusCircle className="h-4 w-4" />
              <span>New Post</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Analytics KPI Cards Grid */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-stone-900/10 bg-stone-50 p-4 backdrop-blur-md transition-all duration-200 hover:border-stone-900/15 hover:bg-stone-900/[0.06]">
          <div className="mb-2 flex items-center justify-between text-stone-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Creations</span>
            <FileText className="h-4 w-4 text-[#f97316]" />
          </div>
          <div className="text-2xl font-black text-stone-900">{myPosts.length}</div>
          <div className="text-[10px] text-stone-500">Total published</div>
        </div>

        <div className="rounded-2xl border border-stone-900/10 bg-stone-50 p-4 backdrop-blur-md transition-all duration-200 hover:border-stone-900/15 hover:bg-stone-900/[0.06]">
          <div className="mb-2 flex items-center justify-between text-stone-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Likes</span>
            <Heart className="h-4 w-4 text-red-500" />
          </div>
          <div className="text-2xl font-black text-stone-900">{totalLikes}</div>
          <div className="text-[10px] text-stone-500">Earned reactions</div>
        </div>

        <div className="rounded-2xl border border-stone-900/10 bg-stone-50 p-4 backdrop-blur-md transition-all duration-200 hover:border-stone-900/15 hover:bg-stone-900/[0.06]">
          <div className="mb-2 flex items-center justify-between text-stone-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Followers</span>
            <Users className="h-4 w-4 text-[#f97316]" />
          </div>
          <div className="text-2xl font-black text-stone-900">{followersCount}</div>
          <div className="text-[10px] text-stone-500">People following you</div>
        </div>

        <div className="rounded-2xl border border-stone-900/10 bg-stone-50 p-4 backdrop-blur-md transition-all duration-200 hover:border-stone-900/15 hover:bg-stone-900/[0.06]">
          <div className="mb-2 flex items-center justify-between text-stone-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Views</span>
            <Eye className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-stone-900">{totalViews}</div>
          <div className="text-[10px] text-emerald-600">Across all posts</div>
        </div>
      </div>

      {/* Active Studio Content Management */}
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-sm font-bold text-stone-900">
          <Clock className="h-4 w-4 text-[#f97316]" />
          <span>My Published Content</span>
        </h2>

        {myPosts.length === 0 ? (
          <div className="rounded-2xl border border-stone-900/10 bg-stone-900/[0.04] p-10 text-center text-xs text-stone-500">
            You have not published any creations yet. Use the New Post button to get started!
          </div>
        ) : (
          <div className="space-y-3">
            {myPosts.map((post) => (
              <div
                key={post.id}
                className="flex items-center justify-between rounded-2xl border border-stone-900/10 bg-stone-50 p-4 backdrop-blur-sm transition-all duration-200 hover:border-stone-900/15 hover:bg-stone-900/[0.05]"
              >
                <div className="flex-1 pr-4">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="rounded-full border border-stone-900/10 bg-stone-900/4 px-2 py-0.5 text-[9px] font-medium text-[#f97316]">
                      {post.category || 'General'}
                    </span>
                    <span className="text-[10px] text-stone-500">
                      {new Date(post.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-xs text-stone-800">{post.content}</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-xs text-stone-500">
                    <Heart className="h-3.5 w-3.5 fill-red-500/20 text-red-500" />
                    <span>{post.like_count || 0}</span>
                  </div>

                  <button
                    type="button"
                    aria-label="Delete post"
                    onClick={() => void handleDeletePost(post.id)}
                    className="rounded-full p-2 text-stone-400 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400 active:scale-90"
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
