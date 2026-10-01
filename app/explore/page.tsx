'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import {
  Search,
  Heart,
  MessageCircle,
  Share2,
  TrendingUp,
  Sparkles,
  Bookmark,
} from 'lucide-react';
import Link from 'next/link';
import { useTrendingTokens } from '@/hooks/useTrendingTokens';
import CommentsModal from '@/components/explore/CommentsModal';

interface PostProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
}

interface ExplorePost {
  id: string;
  content: string;
  category: string;
  image_url?: string | null;
  like_count: number;
  created_at: string;
  user_id: string;
  profiles: PostProfile | PostProfile[];
  user_has_liked?: boolean;
}

export default function ExplorePage() {
  const supabase = getSupabaseClient();
  const [posts, setPosts] = useState<ExplorePost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<ExplorePost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { tokens: trendingTokens, loading: trendingLoading } = useTrendingTokens('hot');
  const [activePostForComments, setActivePostForComments] = useState<ExplorePost | null>(null);

  const categories = ['All', 'Design', 'Tech', 'Art', 'Studio', 'General'];

  const fetchExploreFeed = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      setCurrentUserId(user.id);
    }

    const { data: postsData, error } = await supabase
      .from('posts')
      .select(
        `
        id,
        content,
        category,
        image_url,
        like_count,
        created_at,
        user_id,
        profiles!posts_user_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `
      )
      .order('created_at', { ascending: false });

    if (!error && postsData) {
      let userLikedPostIds: string[] = [];

      if (user) {
        const { data: likesData } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', user.id);

        if (likesData) {
          userLikedPostIds = likesData.map((l: { post_id: string }) => l.post_id);
        }
      }

      const formatted = (postsData as unknown[]).map((rawItem: any) => {
        const profileObj = Array.isArray(rawItem.profiles)
          ? rawItem.profiles[0]
          : rawItem.profiles;

        return {
          ...rawItem,
          profiles: profileObj,
          user_has_liked: userLikedPostIds.includes(rawItem.id),
        } as ExplorePost;
      });

      setPosts(formatted);
      setFilteredPosts(formatted);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void fetchExploreFeed();
  }, [fetchExploreFeed]);

  useEffect(() => {
    let result = posts;

    if (selectedCategory !== 'All') {
      result = result.filter(
        (p) => p.category?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) => {
        const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
        return (
          p.content?.toLowerCase().includes(q) ||
          profile?.username?.toLowerCase().includes(q) ||
          profile?.display_name?.toLowerCase().includes(q)
        );
      });
    }

    setFilteredPosts(result);
  }, [searchQuery, selectedCategory, posts]);

  const handleToggleLike = async (postId: string, currentLikedState: boolean) => {
    if (!currentUserId) return;

    setPosts((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          const updatedCount = currentLikedState
            ? Math.max(0, (post.like_count || 0) - 1)
            : (post.like_count || 0) + 1;

          return {
            ...post,
            user_has_liked: !currentLikedState,
            like_count: updatedCount,
          };
        }
        return post;
      })
    );

    if (currentLikedState) {
      await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', currentUserId);

      const targetPost = posts.find((p) => p.id === postId);
      if (targetPost) {
        await supabase
          .from('posts')
          .update({ like_count: Math.max(0, targetPost.like_count - 1) })
          .eq('id', postId);
      }
    } else {
      await supabase.from('post_likes').insert({
        post_id: postId,
        user_id: currentUserId,
      });

      const targetPost = posts.find((p) => p.id === postId);
      if (targetPost) {
        await supabase
          .from('posts')
          .update({ like_count: (targetPost.like_count || 0) + 1 })
          .eq('id', postId);
      }
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 pb-24">
      {/* Search Header */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -transtone-y-1/2 text-stone-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search global studio creations, users, keywords..."
          className="w-full rounded-2xl border border-stone-900/10 bg-stone-900/[0.05] py-3 pl-11 pr-4 text-sm text-stone-900 outline-none transition-all duration-200 placeholder:text-stone-400 focus:border-[#f97316]/60 focus:bg-stone-900/[0.06]"
        />
      </div>

      {/* Category Pills */}
      <div className="scrollbar-none mb-6 flex items-center gap-2 overflow-x-auto pb-2">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95 ${
                isActive
                  ? 'border-[#f97316] bg-[#f97316] text-black shadow-[0_0_12px_rgba(249,115,22,0.3)]'
                  : 'border-stone-900/10 bg-stone-900/[0.05] text-stone-600 hover:border-stone-900/15 hover:text-stone-900'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Trending Tokens Strip */}
      {!searchQuery && selectedCategory === 'All' && (
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-500">
            <TrendingUp className="h-3.5 w-3.5 text-sky-600" />
            <span>Trending Tokens</span>
            <Link href="/terminal" className="ml-auto text-sky-600 transition-opacity duration-200 hover:underline hover:opacity-80">
              Open Terminal
            </Link>
          </div>

          <div className="scrollbar-none flex gap-3 overflow-x-auto pb-1">
            {trendingLoading && trendingTokens.length === 0 ? (
              [1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 w-32 shrink-0 animate-pulse rounded-2xl bg-stone-900/4" />
              ))
            ) : (
              trendingTokens.slice(0, 12).map((token) => {
                const isUp = (token.priceChange24h ?? 0) >= 0;
                return (
                  <Link
                    key={token.id}
                    href="/terminal"
                    className="flex w-32 shrink-0 flex-col gap-1.5 rounded-2xl border border-stone-900/10 bg-stone-900/[0.05] p-3 transition-all duration-200 hover:border-[#f97316]/40 hover:bg-stone-900/[0.06] active:scale-95"
                  >
                    <div className="flex items-center gap-2">
                      {token.imageUrl ? (
                        <img src={token.imageUrl} alt={token.symbol} className="h-6 w-6 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f97316]/20 text-[10px] font-black text-[#f97316]">
                          {token.symbol?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <span className="truncate text-xs font-bold text-stone-900">{token.symbol}</span>
                    </div>
                    <span className="text-xs text-stone-700">
                      {token.priceUsd ? `$${token.priceUsd < 1 ? token.priceUsd.toPrecision(3) : token.priceUsd.toFixed(2)}` : '--'}
                    </span>
                    <span className={`text-[11px] font-semibold ${isUp ? 'text-emerald-600' : 'text-rose-400'}`}>
                      {token.priceChange24h !== null ? `${isUp ? '+' : ''}${token.priceChange24h.toFixed(1)}%` : '--'}
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Trending Section Banner */}
      {!searchQuery && selectedCategory === 'All' && (
        <div className="mb-8 rounded-2xl border border-orange-700/20 bg-gradient-to-r from-orange-700/10 via-stone-900 to-[#f7f5f2] p-4 backdrop-blur-xl">
          <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#f97316]">
            <Sparkles className="h-4 w-4" />
            <span>Black Bull Spotlight</span>
          </div>
          <h2 className="mb-2 text-base font-bold text-stone-900">
            Discover World-Class Innovations
          </h2>
          <p className="text-xs text-stone-600">
            Explore curated ideas, modern digital tools, and creative feeds from top ecosystem developers.
          </p>
        </div>
      )}

      {/* Content Feed Grid */}
      {loading ? (
        <div className="flex flex-col items-center gap-2 py-20 text-center text-sm font-medium text-stone-500">
          <TrendingUp className="h-6 w-6 animate-bounce text-[#f97316]" />
          <span className="animate-pulse">Curating global feed...</span>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="rounded-2xl border border-stone-900/10 bg-stone-900/[0.04] p-12 text-center text-sm text-stone-500">
          No creations found matching your explore filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filteredPosts.map((post) => {
            const profile = Array.isArray(post.profiles)
              ? post.profiles[0]
              : post.profiles;

            return (
              <div
                key={post.id}
                className="group flex flex-col justify-between rounded-2xl border border-stone-900/10 bg-gradient-to-b from-stone-50 via-[#f7f5f2]/80 to-stone-950 p-4 backdrop-blur-md transition-all duration-200 hover:border-[#f97316]/40 hover:shadow-[0_0_20px_rgba(249,115,22,0.12)]"
              >
                <div>
                  {/* Author Header */}
                  <div className="mb-3 flex items-center justify-between">
                    <Link
                      href={`/profile/${profile?.username}`}
                      className="flex items-center gap-2.5"
                    >
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.display_name}
                          className="h-8 w-8 rounded-full border border-stone-900/10 object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f97316] text-xs font-bold text-black">
                          {profile?.display_name
                            ? profile.display_name[0].toUpperCase()
                            : 'U'}
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-stone-900 transition-colors duration-200 group-hover:text-[#f97316]">
                          {profile?.display_name || 'Anonymous Developer'}
                        </span>
                        <span className="text-[10px] text-stone-500">
                          @{profile?.username || 'user'}
                        </span>
                      </div>
                    </Link>

                    <span className="rounded-full border border-stone-900/10 bg-stone-900/4 px-2 py-0.5 text-[9px] font-medium text-orange-700">
                      {post.category || 'General'}
                    </span>
                  </div>

                  {/* Post Image Attachment */}
                  {post.image_url && (
                    <div className="mb-3 overflow-hidden rounded-xl border border-stone-900/10">
                      <img
                        src={post.image_url}
                        alt="Post media"
                        className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  )}

                  {/* Content Body */}
                  <p className="mb-4 line-clamp-4 text-xs leading-relaxed text-stone-800">
                    {post.content}
                  </p>
                </div>

                {/* Footer Interaction Bar */}
                <div className="flex items-center justify-between border-t border-stone-900/10 pt-3">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() =>
                        void handleToggleLike(post.id, !!post.user_has_liked)
                      }
                      className={`flex items-center gap-1.5 text-xs font-medium transition-all duration-200 active:scale-90 ${
                        post.user_has_liked
                          ? 'text-red-500'
                          : 'text-stone-500 hover:text-stone-900'
                      }`}
                    >
                      <Heart
                        className={`h-4 w-4 ${
                          post.user_has_liked ? 'fill-red-500' : ''
                        }`}
                      />
                      <span>{post.like_count || 0}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActivePostForComments(post)}
                      className="flex items-center gap-1.5 text-xs font-medium text-stone-500 transition-all duration-200 hover:text-[#f97316] active:scale-90"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>Comment</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1 text-stone-500">
                    <button
                      type="button"
                      aria-label="Bookmark"
                      className="rounded-full p-1.5 transition-all duration-200 hover:bg-stone-900/5 hover:text-stone-900 active:scale-90"
                    >
                      <Bookmark className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Share"
                      className="rounded-full p-1.5 transition-all duration-200 hover:bg-stone-900/5 hover:text-stone-900 active:scale-90"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Comments Modal */}
      {activePostForComments && (
        <CommentsModal
          postId={activePostForComments.id}
          currentUserId={currentUserId}
          onClose={() => setActivePostForComments(null)}
        />
      )}
    </div>
  );
}
