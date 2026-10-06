'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Post, Profile } from '@/types/community';
import { Heart, MessageCircle, Eye, Share2, Repeat2, Bookmark, MoreHorizontal, Link2, Trash2, Flag } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { withRetry } from '@/lib/withRetry';
import { useToast } from '@/components/ToastProvider';
import { CommentSection } from './CommentSection';
import { RepostMenu } from './RepostMenu';
import { VerifiedBadge } from './icons';
import { parseMentions } from '@/lib/parseMentions';
import { QuoteComposer } from './QuoteComposer';
import { authedFetch } from '@/lib/authedFetch';

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
  const { showToast } = useToast();
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
  const [viewsCount, setViewsCount] = useState(post.views_count ?? 0);
  const hasCountedView = useRef(false);
  const articleRef = useRef<HTMLElement>(null);

  const [imageLoaded, setImageLoaded] = useState(false);

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
    if (!articleRef.current || hasCountedView.current) return;

    const viewedKey = 'bb_viewed_posts';
    const viewed: string[] = JSON.parse(localStorage.getItem(viewedKey) ?? '[]');

    if (viewed.includes(post.id)) {
      hasCountedView.current = true;
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasCountedView.current) {
            hasCountedView.current = true;
            setViewsCount((prev) => prev + 1);

            const stored: string[] = JSON.parse(localStorage.getItem(viewedKey) ?? '[]');
            if (!stored.includes(post.id)) {
              stored.push(post.id);
              localStorage.setItem(viewedKey, JSON.stringify(stored));
            }

            supabase
              .from('posts')
              .update({ views_count: (post.views_count ?? 0) + 1 })
              .eq('id', post.id)
              .then(({ error }: { error: any }) => {
                if (error) console.error('View count error:', error.message);
              });
            observer.disconnect();
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(articleRef.current);
    return () => observer.disconnect();
  }, [supabase, post.id, post.views_count]);

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

  useEffect(() => {
    const refreshLikes = async () => {
      const { count } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);
      if (typeof count === 'number') setLikesCount(count);
    };
    const channel = supabase
      .channel(`likes:${post.id}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'likes', filter: `post_id=eq.${post.id}` },
        () => { void refreshLikes(); }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'likes' },
        () => { void refreshLikes(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [post.id, supabase]);

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
      const { error } = await withRetry(() =>
        supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', currentUserId)
      );
      if (error) {
        setLiked(true);
        setLikesCount((prev) => prev + 1);
        showToast("Couldn't unlike — check your connection");
        console.error('Unlike error:', error.message);
      }
    } else {
      setLiked(true);
      setLikesCount((prev) => prev + 1);
      const { error } = await withRetry(() =>
        supabase.from('likes').insert({ post_id: post.id, user_id: currentUserId })
      );
      if (error) {
        setLiked(false);
        setLikesCount((prev) => Math.max(0, prev - 1));
        showToast("Couldn't like — check your connection");
        console.error('Like error:', error.message);
      } else if (post.user_id !== currentUserId) {
        await supabase.from('notifications').insert({
          user_id: post.user_id,
          actor_id: currentUserId,
          type: 'like',
          post_id: post.id,
          read: false,
        });

        authedFetch('/api/send-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: post.user_id,
            title: 'New like',
            body: `${displayName} liked your post`,
            url: `/post/${post.id}`,
          }),
        }).catch((err) => console.error('Push notification error:', err));
      }
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
      ref={articleRef}
      onClick={handleCardClick}
      className={`p-4 hover:bg-stone-900/[0.05] transition-colors duration-200 border-b border-stone-900/10 w-full max-w-full ${forceShowComments ? '' : 'overflow-hidden'} ${!forceShowComments && !isQuote ? 'cursor-pointer' : ''}`}
    >
      {repostedByLabel && (
        <div className="mb-2 ml-[52px] -mt-1 flex items-center gap-1.5 text-xs font-bold text-stone-500">
          <Repeat2 className="h-3.5 w-3.5" />
          {repostedByLabel.id === currentUserId
            ? 'You reposted'
            : `${repostedByLabel.display_name || repostedByLabel.username} reposted`}
        </div>
      )}

      <div className="flex gap-3 w-full max-w-full">
        <Link href={`/users/${username}`} className="shrink-0 transition-opacity duration-200 hover:opacity-80">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="h-11 w-11 rounded-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f97316] text-sm font-black text-black">
              {displayName[0]?.toUpperCase()}
            </div>
          )}
        </Link>
        <div className="min-w-0 flex-1 max-w-full pt-0.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 min-w-0 flex-wrap leading-tight">
              <span className="font-semibold text-[14px] text-stone-900 truncate">{displayName}</span>
              {profile?.verified && <VerifiedBadge size={14} />}
              <span className="text-[13px] text-stone-500 truncate">@{username}</span>
              <span className="text-[13px] text-stone-400">·</span>
              <span className="text-[13px] text-stone-500 shrink-0">{timeAgo(post.created_at)}</span>
            </div>

            <div className="relative shrink-0" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((prev) => !prev)}
                className="p-1 rounded-full text-stone-500 hover:text-stone-900 hover:bg-stone-900/5 transition-all duration-200"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-7 z-30 w-44 rounded-2xl border border-stone-900/10 bg-stone-900 shadow-2xl overflow-hidden divide-y divide-stone-900/4">
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-stone-800 hover:bg-stone-900/4 transition-colors duration-150 text-left"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    Copy link
                  </button>

                  {isOwner ? (
                    <button
                      onClick={handleDelete}
                      className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-rose-500 hover:bg-stone-900/4 transition-colors duration-150 text-left"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {isQuote ? 'Delete quote' : 'Delete post'}
                    </button>
                  ) : (
                    <button
                      onClick={handleReport}
                      className="flex items-center gap-2 w-full px-3 py-2.5 text-xs text-stone-800 hover:bg-stone-900/4 transition-colors duration-150 text-left"
                    >
                      <Flag className="h-3.5 w-3.5" />
                      Report
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <p className="mt-1.5 text-[14.5px] leading-6 text-stone-900 whitespace-pre-wrap break-words">{parseMentions(post.content)}</p>

          {post.image_url && (
            <div className="mt-3 overflow-hidden rounded-2xl border border-stone-900/10 max-h-80 w-full max-w-full bg-stone-900/[0.04]">
              <img
                src={post.image_url}
                alt="Post content"
                onLoad={() => setImageLoaded(true)}
                className={`w-full max-w-full object-cover max-h-80 transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                loading="lazy"
              />
            </div>
          )}

          {quotedPost && (
            <Link
              href={`/post/${quotedPost.id}`}
              onClick={(e) => e.stopPropagation()}
              className="mt-3 block overflow-hidden rounded-2xl border border-stone-900/10 hover:bg-stone-900/[0.05] transition-colors duration-200"
            >
              <div className="p-3">
                <div className="flex items-center gap-1.5 text-[13px] min-w-0">
                  {quotedPost.profiles?.avatar_url ? (
                    <img src={quotedPost.profiles.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover shrink-0" loading="lazy" />
                  ) : (
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f97316] text-[10px] font-black text-black">
                      {(quotedPost.profiles?.display_name || 'U')[0]?.toUpperCase()}
                    </div>
                  )}
                  <span className="font-bold text-stone-900 truncate">{quotedPost.profiles?.display_name || 'User'}</span>
                  <span className="text-stone-500 truncate">@{quotedPost.profiles?.username || 'user'}</span>
                </div>
                <p className="mt-1.5 line-clamp-4 text-[13px] leading-5 text-stone-700">
                  {quotedPost.content}
                </p>
                {quotedPost.image_url && (
                  <div className="mt-2 overflow-hidden rounded-xl border border-stone-900/10 max-h-48">
                    <img src={quotedPost.image_url} alt="" className="w-full object-cover max-h-48" loading="lazy" />
                  </div>
                )}
              </div>
            </Link>
          )}

          {isQuote ? (
            <div className="flex items-center gap-4 mt-3 text-stone-500 max-w-md">
              <div className="flex items-center gap-1.5 text-xs">
                <Eye className="h-4 w-4" />
                <span>{viewsCount}</span>
              </div>
              <button onClick={handleShare} className="hover:text-stone-900 transition-colors duration-200">
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between mt-3 -ml-1.5 text-stone-500 max-w-md">
              <button
                onClick={handleLike}
                className={`flex items-center gap-1.5 text-xs rounded-full p-1.5 transition-all duration-200 active:scale-90 ${liked ? 'text-rose-500' : 'hover:text-rose-400 hover:bg-rose-500/10'}`}
              >
                <Heart className={`h-[18px] w-[18px] ${liked ? 'fill-rose-500' : ''}`} />
                {likesCount > 0 && <span className="text-[13px]">{likesCount}</span>}
              </button>

              <Link
                href={`/post/${post.id}`}
                className={`flex items-center gap-1.5 text-xs rounded-full p-1.5 transition-all duration-200 active:scale-90 ${forceShowComments ? 'text-[#f97316]' : 'hover:text-[#f97316] hover:bg-[#f97316]/10'}`}
              >
                <MessageCircle className="h-[18px] w-[18px]" />
                {commentsCount > 0 && <span className="text-[13px]">{commentsCount}</span>}
              </Link>

              <div className="rounded-full p-1.5 transition-all duration-200 active:scale-90 hover:bg-emerald-500/10">
                <RepostMenu
                  postId={post.id}
                  supabase={supabase}
                  currentUserId={currentUserId}
                  onChange={fetchPosts}
                  onQuoteClick={() => setQuoteOpen(true)}
                />
              </div>

              <div className="flex items-center gap-1.5 text-[13px] p-1.5">
                <Eye className="h-[18px] w-[18px]" />
                <span>{viewsCount}</span>
              </div>

              <button
                onClick={handleShare}
                className="rounded-full p-1.5 transition-all duration-200 active:scale-90 hover:text-[#f97316] hover:bg-[#f97316]/10"
              >
                <Share2 className="h-[18px] w-[18px]" />
              </button>

              <button
                onClick={handleBookmark}
                className={`rounded-full p-1.5 transition-all duration-200 active:scale-90 ${bookmarked ? 'text-[#f97316]' : 'hover:text-[#f97316] hover:bg-[#f97316]/10'}`}
              >
                <Bookmark className={`h-[18px] w-[18px] ${bookmarked ? 'fill-[#f97316]' : ''}`} />
              </button>
            </div>
          )}
        </div>
      </div>

      {forceShowComments && (
        <CommentSection
          postId={post.id}
          postOwnerId={post.user_id}
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
