'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import type { Post } from '@/types/community';
import { Heart, MessageCircle, Eye, Share2, Repeat2, Bookmark, MoreHorizontal, Link2, Trash2, Flag } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';

interface PostCardProps {
  post: Post;
  supabase: SupabaseClient;
  currentUserId: string | null;
  fetchPosts: () => void;
  forceShowComments?: boolean;
}

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function PostCard({ post, supabase, currentUserId, fetchPosts, forceShowComments }: PostCardProps) {
  const [liked, setLiked] = useState<boolean>(post.user_has_liked ?? false);
  const [likesCount, setLikesCount] = useState<number>(post.likes_count ?? 0);
  const [isLiking, setIsLiking] = useState(false);

  const [reposted, setReposted] = useState(false);
  const [repostsCount, setRepostsCount] = useState(0);
  const [isReposting, setIsReposting] = useState(false);

  const [bookmarked, setBookmarked] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const profile = post.profiles;
  const displayName = profile?.display_name || 'User';
  const username = profile?.username || 'user';
  const avatarUrl = profile?.avatar_url;
  const isOwner = currentUserId === post.user_id;

  useEffect(() => {
    setLiked(post.user_has_liked ?? false);
    setLikesCount(post.likes_count ?? 0);
  }, [post.user_has_liked, post.likes_count]);

  useEffect(() => {
    async function loadStatus() {
      if (!currentUserId) return;

      const { count, error: countError } = await supabase
        .from('post_reposts')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);
      if (countError) console.error('Repost count error:', countError.message);
      setRepostsCount(count ?? 0);

      const { data: repostRow, error: repostError } = await supabase
        .from('post_reposts')
        .select('id')
        .eq('post_id', post.id)
        .eq('user_id', currentUserId)
        .maybeSingle();
      if (repostError) console.error('Repost status error:', repostError.message);
      setReposted(!!repostRow);

      const { data: bookmarkRow, error: bookmarkError } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('post_id', post.id)
        .eq('user_id', currentUserId)
        .maybeSingle();
      if (bookmarkError) console.error('Bookmark status error:', bookmarkError.message);
      setBookmarked(!!bookmarkRow);
    }

    void loadStatus();
  }, [post.id, currentUserId, supabase]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleLike() {
    if (!currentUserId) {
      alert('Please log in to like posts');
      return;
    }
    if (isLiking) return;
    setIsLiking(true);

    if (liked) {
      setLiked(false);
      setLikesCount((prev) => Math.max(0, prev - 1));
      const { error } = await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', currentUserId);
      if (error) console.error('Unlike error:', error.message);
    } else {
      setLiked(true);
      setLikesCount((prev) => prev + 1);
      const { error } = await supabase.from('likes').insert({ post_id: post.id, user_id: currentUserId });
      if (error) console.error('Like error:', error.message);
    }

    setIsLiking(false);
  }

  async function handleRepost() {
    if (!currentUserId) {
      alert('Please log in to repost');
      return;
    }
    if (isReposting) return;
    setIsReposting(true);

    if (reposted) {
      setReposted(false);
      setRepostsCount((prev) => Math.max(0, prev - 1));
      const { error } = await supabase.from('post_reposts').delete().eq('post_id', post.id).eq('user_id', currentUserId);
      if (error) console.error('Unrepost error:', error.message);
    } else {
      setReposted(true);
      setRepostsCount((prev) => prev + 1);
      const { error } = await supabase.from('post_reposts').insert({ post_id: post.id, user_id: currentUserId });
      if (error) console.error('Repost error:', error.message);
    }

    setIsReposting(false);
  }

  async function handleBookmark() {
    if (!currentUserId) {
      alert('Please log in to bookmark posts');
      return;
    }
    if (isBookmarking) return;
    setIsBookmarking(true);

    if (bookmarked) {
      setBookmarked(false);
      const { error } = await supabase.from('bookmarks').delete().eq('post_id', post.id).eq('user_id', currentUserId);
      if (error) console.error('Unbookmark error:', error.message);
    } else {
      setBookmarked(true);
      const { error } = await supabase.from('bookmarks').insert({ post_id: post.id, user_id: currentUserId });
      if (error) console.error('Bookmark error:', error.message);
    }

    setIsBookmarking(false);
  }

  async function handleCopyLink() {
    const url = `${window.location.origin}/post/${post.id}`;
    await navigator.clipboard.writeText(url);
    setMenuOpen(false);
  }

  async function handleDelete() {
    setMenuOpen(false);
    const confirmed = window.confirm('Delete this post? This cannot be undone.');
    if (!confirmed) return;

    const { error } = await supabase.from('posts').delete().eq('id', post.id);
    if (!error) {
      setIsDeleted(true);
      fetchPosts();
    } else {
      alert('Error deleting post: ' + error.message);
    }
  }

  function handleReport() {
    setMenuOpen(false);
    alert('Post reported. Our team will review it shortly.');
  }

  if (isDeleted) return null;

  return (
    <article className="p-4 hover:bg-white/[0.02] transition border-b border-white/10 w-full max-w-full overflow-hidden">
      <div className="flex gap-3 w-full max-w-full">
        <Link href={`/profile`} className="shrink-0 pt-1">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5b942] text-sm font-black text-black">
              {displayName[0]?.toUpperCase()}
            </div>
          )}
        </Link>

        <div className="min-w-0 flex-1 max-w-full">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              <span className="font-bold text-sm text-white truncate">{displayName}</span>
              <span className="text-xs text-white/40 truncate">@{username}</span>
              <span className="text-xs text-white/40">·</span>
              <span className="text-xs text-white/40 shrink-0">{timeAgo(post.created_at)}</span>
            </div>

            <div className="relative shrink-0" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((prev) => !prev)}
                className="p-1 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-7 z-30 w-44 rounded-xl border border-white/10 bg-zinc-900 shadow-xl overflow-hidden">
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-white/80 hover:bg-white/5 text-left"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    Copy link
                  </button>

                  {isOwner ? (
                    <button
                      onClick={handleDelete}
                      className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-rose-500 hover:bg-white/5 text-left"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete post
                    </button>
                  ) : (
                    <button
                      onClick={handleReport}
                      className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-white/80 hover:bg-white/5 text-left"
                    >
                      <Flag className="h-3.5 w-3.5" />
                      Report
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <p className="mt-1 text-sm text-white/90 whitespace-pre-wrap break-words">{post.content}</p>

          {post.image_url && (
            <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 max-h-80 w-full max-w-full">
              <img src={post.image_url} alt="Post content" className="w-full max-w-full object-cover max-h-80" />
            </div>
          )}

          <div className="flex items-center justify-between mt-3 text-white/40 max-w-md">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 text-xs transition ${liked ? 'text-rose-500' : 'hover:text-white'}`}
            >
              <Heart className={`h-4 w-4 ${liked ? 'fill-rose-500' : ''}`} />
              <span>{likesCount}</span>
            </button>

            <Link href={`/post/${post.id}`} className={`flex items-center gap-1.5 text-xs transition ${forceShowComments ? 'text-[#f5b942]' : 'hover:text-white'}`}>
              <MessageCircle className="h-4 w-4" />
              <span>{post.comments_count ?? 0}</span>
            </Link>

            <button
              onClick={handleRepost}
              className={`flex items-center gap-1.5 text-xs transition ${reposted ? 'text-emerald-500' : 'hover:text-white'}`}
            >
              <Repeat2 className="h-4 w-4" />
              <span>{repostsCount}</span>
            </button>

            <div className="flex items-center gap-1.5 text-xs">
              <Eye className="h-4 w-4" />
              <span>{post.views_count ?? 0}</span>
            </div>

            <button className="hover:text-white transition">
              <Share2 className="h-4 w-4" />
            </button>

            <button
              onClick={handleBookmark}
              className={`transition ${bookmarked ? 'text-[#f5b942]' : 'hover:text-white'}`}
            >
              <Bookmark className={`h-4 w-4 ${bookmarked ? 'fill-[#f5b942]' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
