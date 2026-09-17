'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Post, Profile } from '@/types/community';
import { Heart, MessageCircle, Eye, Share2, Repeat2, Bookmark, MoreHorizontal, Link2, Trash2, Flag } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { CommentSection } from './CommentSection';
import { RepostMenu } from './RepostMenu';
import { QuoteComposer } from './QuoteComposer';

interface PostCardProps {
  post: Post;
  supabase: SupabaseClient;
  currentUserId: string | null;
  fetchPosts: () => void;
  forceShowComments?: boolean;
  initialReposted?: boolean;
  initialBookmarked?: boolean;
  initialRepostsCount?: number;
  repostedByLabel?: Profile | null;
  quotedPost?: Post | null;
  repostRowId?: string;
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

export function PostCard({
  post,
  supabase,
  currentUserId,
  fetchPosts,
  forceShowComments,
  initialReposted = false,
  initialBookmarked = false,
  initialRepostsCount = 0,
  repostedByLabel = null,
  quotedPost = null,
  repostRowId,
}: PostCardProps) {
  const router = useRouter();
  const isQuote = !!quotedPost;

  const [liked, setLiked] = useState<boolean>(post.user_has_liked ?? false);
  const [likesCount, setLikesCount] = useState<number>(post.likes_count ?? 0);
  const [isLiking, setIsLiking] = useState(false);

  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [isBookmarking, setIsBookmarking] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [commentsCount, setCommentsCount] = useState(post.comments_count ?? 0);
  const [quoteOpen, setQuoteOpen] = useState(false);

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
    setBookmarked(initialBookmarked);
  }, [initialBookmarked]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleCardClick(e: React.MouseEvent<HTMLElement>) {
    if (forceShowComments || isQuote) return;
    const target = e.target as HTMLElement;
    if (target.closest('a, button, textarea, input')) return;
    router.push(`/post/${post.id}`);
  }

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
    const url = `${window.location.origin}/post/${quotedPost ? quotedPost.id : post.id}`;
    await navigator.clipboard.writeText(url);
    setMenuOpen(false);
  }

  async function handleShare() {
    const url = `${window.location.origin}/post/${quotedPost ? quotedPost.id : post.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ url });
      } catch {
        // user cancelled share sheet
      }
    } else {
      await navigator.clipboard.writeText(url);
    }
  }

  async function handleDelete() {
    setMenuOpen(false);
    const confirmed = window.confirm(isQuote ? 'Delete this quote?' : 'Delete this post? This cannot be undone.');
    if (!confirmed) return;

    const { error } = isQuote && repostRowId
      ? await supabase.from('reposts').delete().eq('id', repostRowId)
      : await supabase.from('posts').delete().eq('id', post.id);

    if (!error) {
      setIsDeleted(true);
      fetchPosts();
    } else {
      alert('Error deleting: ' + error.message);
    }
  }

  function handleReport() {
    setMenuOpen(false);
    alert('Post reported. Our team will review it shortly.');
  }

  if (isDeleted) return null;

  return (
    <article
      onClick={handleCardClick}
      className={`p-4 hover:bg-white/[0.02] transition border-b border-white/10 w-full max-w-full overflow-hidden ${!forceShowComments && !isQuote ? 'cursor-pointer' : ''}`}
    >
      {repostedByLabel && (
        <div className="mb-2 ml-[52px] -mt-1 flex items-center gap-1.5 text-xs font-bold text-white/40">
          <Repeat2 className="h-3.5 w-3.5" />
          {repostedByLabel.id === currentUserId
            ? 'You reposted'
            : `${repostedByLabel.display_name || repostedByLabel.username} reposted`}
        </div>
      )}

      <div className="flex gap-3 w-full max-w-full">
        <Link href={`/users/${username}`} className="shrink-0 pt-1">
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
                      {isQuote ? 'Delete quote' : 'Delete post'}
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

          {quotedPost && (
            <Link
              href={`/post/${quotedPost.id}`}
              onClick={(e) => e.stopPropagation()}
              className="mt-3 block overflow-hidden rounded-2xl border border-white/[0.08] hover:bg-white/[0.02] transition"
            >
              <div className="p-3">
                <div className="flex items-center gap-1.5 text-[13px] min-w-0">
                  {quotedPost.profiles?.avatar_url ? (
                    <img src={quotedPost.profiles.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f5b942] text-[10px] font-black text-black">
                      {(quotedPost.profiles?.display_name || 'U')[0]?.toUpperCase()}
                    </div>
                  )}
                  <span className="font-bold text-white truncate">{quotedPost.profiles?.display_name || 'User'}</span>
                  <span className="text-white/40 truncate">@{quotedPost.profiles?.username || 'user'}</span>
                </div>
                <p className="mt-1.5 line-clamp-4 text-[13px] leading-5 text-white/70">
                  {quotedPost.content}
                </p>
                {quotedPost.image_url && (
                  <div className="mt-2 overflow-hidden rounded-xl border border-white/10 max-h-48">
                    <img src={quotedPost.image_url} alt="" className="w-full object-cover max-h-48" />
                  </div>
                )}
              </div>
            </Link>
          )}

          {isQuote ? (
            <div className="flex items-center gap-4 mt-3 text-white/40 max-w-md">
              <div className="flex items-center gap-1.5 text-xs">
                <Eye className="h-4 w-4" />
                <span>{post.views_count ?? 0}</span>
              </div>
              <button onClick={handleShare} className="hover:text-white transition">
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          ) : (
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
                <span>{commentsCount}</span>
              </Link>

              <RepostMenu
                postId={post.id}
                supabase={supabase}
                currentUserId={currentUserId}
                onChange={fetchPosts}
                onQuoteClick={() => setQuoteOpen(true)}
              />

              <div className="flex items-center gap-1.5 text-xs">
                <Eye className="h-4 w-4" />
                <span>{post.views_count ?? 0}</span>
              </div>

              <button onClick={handleShare} className="hover:text-white transition">
                <Share2 className="h-4 w-4" />
              </button>

              <button
                onClick={handleBookmark}
                className={`transition ${bookmarked ? 'text-[#f5b942]' : 'hover:text-white'}`}
              >
                <Bookmark className={`h-4 w-4 ${bookmarked ? 'fill-[#f5b942]' : ''}`} />
              </button>
            </div>
          )}
        </div>
      </div>

      {forceShowComments && (
        <CommentSection
          postId={post.id}
          supabase={supabase}
          currentUserId={currentUserId}
          onCountChange={setCommentsCount}
        />
      )}

      {quoteOpen && (
        <QuoteComposer
          post={post}
          supabase={supabase}
          currentUserId={currentUserId}
          onClose={() => setQuoteOpen(false)}
          onPosted={fetchPosts}
        />
      )}
    </article>
  );
}
