'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useParams } from 'next/navigation';
import {
  FileText,
  Heart,
  Calendar,
  Sparkles,
  ArrowLeft,
  UserCheck,
  Share2,
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
  created_at?: string;
}

export default function PublicProfilePage() {
  const supabase = getSupabaseClient();
  const params = useParams();
  const rawUsername = params?.username as string;
  const username = rawUsername ? decodeURIComponent(rawUsername) : '';

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userPosts, setUserPosts] = useState<UserPost[]>([]);
  const [totalLikes, setTotalLikes] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  const fetchPublicProfile = useCallback(async () => {
    if (!username) return;
    setLoading(true);

    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, bio, created_at')
      .eq('username', username)
      .single();

    if (profileData) {
      const typedProfile = profileData as UserProfile;
      setProfile(typedProfile);

      const { data: postsData } = await supabase
        .from('posts')
        .select('id, content, like_count, created_at, category')
        .eq('user_id', typedProfile.id)
        .order('created_at', { ascending: false });

      if (postsData) {
        const typedPosts = postsData as UserPost[];
        setUserPosts(typedPosts);

        const calculatedLikes = typedPosts.reduce(
          (sum, p) => sum + (p.like_count || 0),
          0
        );
        setTotalLikes(calculatedLikes);
      }
    }

    setLoading(false);
  }, [supabase, username]);

  useEffect(() => {
    void fetchPublicProfile();
  }, [fetchPublicProfile]);

  const handleShareProfile = () => {
    if (typeof window !== 'undefined') {
      void navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-sm text-stone-500">
        <Sparkles className="h-6 w-6 animate-pulse text-[#f97316]" />
        <span>Loading Creator Profile...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="mb-4 text-4xl">🔍</div>
        <h1 className="text-base font-bold text-stone-900">Profile Not Found</h1>
        <p className="mt-1 text-xs text-stone-500">
          The creator @{username} does not exist or has been removed.
        </p>
        <Link
          href="/explore"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-stone-900/5 px-4 py-2 text-xs font-semibold text-stone-900 hover:bg-stone-900/10 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Explore</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 pb-24">
      {/* Header Back Button */}
      <div className="mb-6">
        <Link
          href="/explore"
          className="inline-flex items-center gap-2 text-xs font-semibold text-stone-600 hover:text-stone-900 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Explore</span>
        </Link>
      </div>

      {/* Hero Profile Card */}
      <div className="relative mb-8 rounded-2xl border border-stone-900/10 bg-gradient-to-b from-stone-100 via-white to-[#f7f5f2] p-6 backdrop-blur-xl">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="h-16 w-16 rounded-full border-2 border-[#f97316] object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f97316] text-xl font-bold text-black">
                {profile.display_name ? profile.display_name[0].toUpperCase() : 'U'}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                <span>{profile.display_name}</span>
                <UserCheck className="h-4 w-4 text-[#f97316]" />
              </h1>
              <p className="text-xs text-stone-500">@{profile.username}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleShareProfile}
            className="flex items-center gap-1.5 rounded-full border border-stone-900/10 bg-stone-900/4 px-4 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-900/5 hover:text-stone-900 transition"
          >
            <Share2 className="h-3.5 w-3.5 text-[#f97316]" />
            <span>{copied ? 'Link Copied!' : 'Share Profile'}</span>
          </button>
        </div>

        {/* Bio Section */}
        {profile.bio && (
          <p className="mt-4 text-xs text-stone-700 leading-relaxed border-t border-stone-900/4 pt-4">
            {profile.bio}
          </p>
        )}

        {/* Stats Row */}
        <div className="mt-6 flex items-center gap-6 border-t border-stone-900/4 pt-4 text-xs text-stone-500">
          <div className="flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-[#f97316]" />
            <span className="font-bold text-stone-900">{userPosts.length}</span>
            <span>Posts</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Heart className="h-4 w-4 text-red-500" />
            <span className="font-bold text-stone-900">{totalLikes}</span>
            <span>Likes</span>
          </div>
          {profile.created_at && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-stone-500" />
              <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* User's Creations List */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-stone-900">
          Creations by {profile.display_name}
        </h2>

        {userPosts.length === 0 ? (
          <div className="rounded-2xl border border-stone-900/4 bg-stone-900/[0.04] p-10 text-center text-xs text-stone-500">
            This creator has not published any posts yet.
          </div>
        ) : (
          <div className="space-y-3">
            {userPosts.map((post) => (
              <div
                key={post.id}
                className="rounded-xl border border-stone-900/10 bg-stone-50 p-4 backdrop-blur-sm transition hover:border-stone-900/15"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="rounded-full border border-stone-900/10 bg-stone-900/4 px-2.5 py-0.5 text-[9px] font-medium text-[#f97316]">
                    {post.category || 'General'}
                  </span>
                  <span className="text-[10px] text-stone-500">
                    {new Date(post.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-stone-900 leading-relaxed">{post.content}</p>
                <div className="mt-3 flex items-center gap-1 text-xs text-stone-500">
                  <Heart className="h-3.5 w-3.5 text-red-500 fill-red-500/20" />
                  <span>{post.like_count || 0}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
