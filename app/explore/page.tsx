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
  X,
  Send,
} from 'lucide-react';
import Link from 'next/link';

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

interface CommentItem {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: PostProfile | PostProfile[];
}

export default function ExplorePage() {
  const supabase = getSupabaseClient();
  const [posts, setPosts] = useState<ExplorePost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<ExplorePost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Active Comment Modal State
  const [activePostForComments, setActivePostForComments] = useState<ExplorePost | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [loadingComments, setLoadingComments] = useState<boolean>(false);
  const [submittingComment, setSubmittingComment] = useState<boolean>(false);

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

  // Fetch comments for selected post
  const openCommentsModal = async (post: ExplorePost) => {
    setActivePostForComments(post);
    setLoadingComments(true);
    setComments([]);

    const { data, error } = await supabase
      .from('post_comments')
      .select(
        `
        id,
        content,
        created_at,
        user_id,
        profiles!post_comments_user_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `
      )
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      const formatted = (data as unknown[]).map((rawItem: any) => ({
        ...rawItem,
        profiles: Array.isArray(rawItem.profiles) ? rawItem.profiles[0] : rawItem.profiles,
      })) as CommentItem[];

      setComments(formatted);
    }

    setLoadingComments(false);
  };

  // Submit new comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !activePostForComments || !currentUserId) return;

    setSubmittingComment(true);

    const { data: newCommentData, error } = await supabase
      .from('post_comments')
      .insert({
        post_id: activePostForComments.id,
        user_id: currentUserId,
        content: newCommentText.trim(),
      })
      .select(
        `
        id,
        content,
        created_at,
        user_id,
        profiles!post_comments_user_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `
      )
      .single();

    if (!error && newCommentData) {
      const formatted = {
        ...newCommentData,
        profiles: Array.isArray(newCommentData.profiles)
          ? newCommentData.profiles[0]
          : newCommentData.profiles,
      } as CommentItem;

      setComments((prev) => [...prev, formatted]);
      setNewCommentText('');
    }

    setSubmittingComment(false);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 pb-24">
      {/* Search Header */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search global studio creations, users, keywords..."
          className="w-full rounded-2xl border border-white/10 bg-white/[0.03] py-3 pl-11 pr-4 text-sm text-white shadow-inner outline-none placeholder:text-white/30 focus:border-[#f5b942]/60 focus:bg-black/60 transition"
        />
      </div>

      {/* Category Pills */}
      <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition shrink-0 border ${
                isActive
                  ? 'border-[#f5b942] bg-[#f5b942] text-black shadow-[0_0_12px_rgba(245,185,66,0.3)]'
                  : 'border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20 hover:text-white'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Trending Section Banner */}
      {!searchQuery && selectedCategory === 'All' && (
        <div className="mb-8 rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-neutral-900 to-black p-4 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#f5b942] mb-1">
            <Sparkles className="h-4 w-4" />
            <span>Black Bull Spotlight</span>
          </div>
          <h2 className="text-base font-bold text-white mb-2">
            Discover World-Class Innovations
          </h2>
          <p className="text-xs text-white/60">
            Explore curated ideas, modern digital tools, and creative feeds from top ecosystem developers.
          </p>
        </div>
      )}

      {/* Content Feed Grid */}
      {loading ? (
        <div className="py-20 text-center text-sm font-medium text-white/40 flex flex-col items-center gap-2">
          <TrendingUp className="h-6 w-6 animate-bounce text-[#f5b942]" />
          <span>Curating global feed...</span>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-12 text-center text-sm text-white/40">
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
                className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-gradient-to-b from-neutral-900/60 via-black/80 to-neutral-950 p-4 backdrop-blur-md transition duration-300 hover:border-[#f5b942]/40 hover:shadow-[0_0_20px_rgba(245,185,66,0.15)]"
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
                          className="h-8 w-8 rounded-full border border-white/10 object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f5b942] text-xs font-bold text-black">
                          {profile?.display_name
                            ? profile.display_name[0].toUpperCase()
                            : 'U'}
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white group-hover:text-[#f5b942] transition">
                          {profile?.display_name || 'Anonymous Developer'}
                        </span>
                        <span className="text-[10px] text-white/40">
                          @{profile?.username || 'user'}
                        </span>
                      </div>
                    </Link>

                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-medium text-amber-400">
                      {post.category || 'General'}
                    </span>
                  </div>

                  {/* Post Image Attachment */}
                  {post.image_url && (
                    <div className="mb-3 overflow-hidden rounded-xl border border-white/10">
                      <img
                        src={post.image_url}
                        alt="Post media"
                        className="h-44 w-full object-cover group-hover:scale-105 transition duration-500"
                      />
                    </div>
                  )}

                  {/* Content Body */}
                  <p className="mb-4 text-xs leading-relaxed text-white/80 line-clamp-4">
                    {post.content}
                  </p>
                </div>

                {/* Footer Interaction Bar */}
                <div className="flex items-center justify-between border-t border-white/5 pt-3">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() =>
                        void handleToggleLike(post.id, !!post.user_has_liked)
                      }
                      className={`flex items-center gap-1.5 text-xs font-medium transition ${
                        post.user_has_liked
                          ? 'text-red-500'
                          : 'text-white/50 hover:text-white'
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
                      onClick={() => void openCommentsModal(post)}
                      className="flex items-center gap-1.5 text-xs font-medium text-white/50 hover:text-[#f5b942] transition"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>Comment</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-white/40">
                    <button
                      type="button"
                      className="hover:text-white transition"
                    >
                      <Bookmark className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="hover:text-white transition"
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

      {/* COMMENTS POPUP MODAL */}
      {activePostForComments && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="flex h-[80vh] w-full max-w-lg flex-col rounded-2xl border border-white/10 bg-neutral-950 p-5 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-[#f5b942]" />
                <span>Comments</span>
              </h3>
              <button
                type="button"
                onClick={() => setActivePostForComments(null)}
                className="text-white/40 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Comments Stream */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {loadingComments ? (
                <div className="py-8 text-center text-xs text-white/40">
                  Loading comments...
                </div>
              ) : comments.length === 0 ? (
                <div className="py-8 text-center text-xs text-white/40">
                  No comments yet. Be the first to start the discussion!
                </div>
              ) : (
                comments.map((comment) => {
                  const author = Array.isArray(comment.profiles)
                    ? comment.profiles[0]
                    : comment.profiles;

                  return (
                    <div
                      key={comment.id}
                      className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        {author?.avatar_url ? (
                          <img
                            src={author.avatar_url}
                            alt="Avatar"
                            className="h-6 w-6 rounded-full border border-white/10 object-cover"
                          />
                        ) : (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f5b942] text-[10px] font-bold text-black">
                            {author?.display_name
                              ? author.display_name[0].toUpperCase()
                              : 'U'}
                          </div>
                        )}
                        <span className="font-bold text-white">
                          {author?.display_name || 'User'}
                        </span>
                        <span className="text-[10px] text-white/30">
                          {new Date(comment.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-white/80 leading-relaxed pl-8">
                        {comment.content}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add Comment Input Form */}
            <form onSubmit={handleAddComment} className="border-t border-white/10 pt-3 flex items-center gap-2">
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none placeholder:text-white/30 focus:border-[#f5b942]"
              />
              <button
                type="submit"
                disabled={submittingComment || !newCommentText.trim()}
                className="flex items-center justify-center rounded-xl bg-[#f5b942] px-3 py-2 text-black font-bold disabled:opacity-40 transition"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
