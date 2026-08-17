'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MessageCircle, Heart, Repeat2, Share2, Send } from 'lucide-react';
import { Post, Comment } from '@/types/database';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function SinglePostPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params?.id as string;

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  const [reposted, setReposted] = useState(false);
  const [repostsCount, setRepostsCount] = useState(0);

  const fetchPostAndComments = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const { data: postData, error: postErr } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .single();

      if (!postErr && postData) {
        setPost(postData);

        const { count: likes } = await supabase
          .from('post_likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', id);
        setLikesCount(likes || 0);

        const { count: reposts } = await supabase
          .from('post_reposts')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', id);
        setRepostsCount(reposts || 0);
      }

      const { data: commentData, error: commentErr } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', id)
        .order('created_at', { ascending: true });

      if (!commentErr && commentData) {
        setComments(commentData);
      }
    } catch (err) {
      console.error('Error fetching post details:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (postId) {
      fetchPostAndComments(postId);
    }
  }, [postId, fetchPostAndComments]);

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim() || !post || submitting) return;

    setSubmitting(true);
    const commentPayload = {
      post_id: post.id,
      author_name: 'Ansem Bull',
      username: 'Danzakine0',
      text: newComment.trim(),
    };

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert([commentPayload])
        .select();

      if (!error && data && data[0]) {
        setComments((prev) => [...prev, data[0]]);
        setNewComment('');
      }
    } catch (err) {
      console.error('Error adding comment:', err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleLike() {
    if (!post) return;
    const nextState = !liked;
    setLiked(nextState);
    setLikesCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));

    if (nextState) {
      await supabase.from('post_likes').insert([{ post_id: post.id }]);
    } else {
      await supabase.from('post_likes').delete().eq('post_id', post.id);
    }
  }

  async function handleToggleRepost() {
    if (!post) return;
    const nextState = !reposted;
    setReposted(nextState);
    setRepostsCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));

    if (nextState) {
      await supabase.from('post_reposts').insert([{ post_id: post.id }]);
    } else {
      await supabase.from('post_reposts').delete().eq('post_id', post.id);
    }
  }

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-black text-zinc-100 flex items-center justify-center text-xs text-zinc-500 animate-pulse">
        Loading post...
      </div>
    );
  }

  if (!post) {
    return (
      <div className="w-full min-h-screen bg-black text-zinc-100 p-6 text-center">
        <p className="text-xs text-zinc-400">Post not found.</p>
        <Link href="/dashboard" className="mt-4 inline-block text-xs text-amber-500 hover:underline font-semibold">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto min-h-screen bg-black text-zinc-100 border-x border-zinc-800/80">
      <div className="p-3 border-b border-zinc-800/80 flex items-center gap-4 sticky top-0 bg-black/80 backdrop-blur-md z-20">
        <button onClick={() => router.back()} className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-300">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-sm font-bold text-zinc-100">Post</h1>
      </div>

      <div className="p-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-amber-500 text-sm">
            {post.author_name ? post.author_name.charAt(0).toUpperCase() : 'A'}
          </div>
          <div>
            <div className="font-bold text-sm text-zinc-100">{post.author_name}</div>
            <div className="text-xs text-zinc-500">@{post.username}</div>
          </div>
        </div>

        <p className="mt-4 text-sm text-zinc-100 leading-relaxed whitespace-pre-line">
          {post.content}
        </p>

        {post.image_url && (
          <div className="mt-4 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 max-h-96">
            <img src={post.image_url} alt="Post Attachment" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="mt-4 py-2 border-y border-zinc-900 text-xs text-zinc-500">
          {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
          {new Date(post.created_at).toLocaleDateString()}
        </div>

        <div className="flex items-center justify-between py-3 border-b border-zinc-900 text-xs text-zinc-500 max-w-md">
          <button className="flex items-center gap-1.5 hover:text-sky-400 transition">
            <MessageCircle className="w-4 h-4" />
            <span>{comments.length}</span>
          </button>
          <button
            onClick={handleToggleRepost}
            className={`flex items-center gap-1.5 transition ${
              reposted ? 'text-emerald-500 font-bold' : 'hover:text-emerald-400'
            }`}
          >
            <Repeat2 className="w-4 h-4" />
            <span>{repostsCount}</span>
          </button>
          <button
            onClick={handleToggleLike}
            className={`flex items-center gap-1.5 transition ${
              liked ? 'text-rose-500 font-bold' : 'hover:text-rose-400'
            }`}
          >
            <Heart className={`w-4 h-4 ${liked ? 'fill-rose-500' : ''}`} />
            <span>{likesCount}</span>
          </button>
          <button className="hover:text-zinc-300">
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <form onSubmit={handleAddComment} className="p-3 border-b border-zinc-800/80 flex gap-3 items-center bg-zinc-950">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Post your reply..."
          className="flex-1 bg-transparent text-xs text-zinc-100 placeholder-zinc-500 outline-none border-none focus:ring-0"
        />
        <button
          type="submit"
          disabled={!newComment.trim() || submitting}
          className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-4 py-1.5 rounded-full transition disabled:opacity-40 flex items-center gap-1"
        >
          <span>{submitting ? '...' : 'Reply'}</span>
          <Send className="w-3 h-3" />
        </button>
      </form>

      <div className="divide-y divide-zinc-900">
        {comments.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-600">No replies yet. Be the first to reply!</div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="p-4 hover:bg-zinc-900/30 transition flex gap-3">
              <div className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-amber-500 text-xs flex-shrink-0">
                {comment.author_name ? comment.author_name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="font-bold text-zinc-200">{comment.author_name}</span>
                  <span className="text-zinc-500">@{comment.username}</span>
                </div>
                <p className="mt-1 text-xs text-zinc-300 leading-relaxed">{comment.text}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
