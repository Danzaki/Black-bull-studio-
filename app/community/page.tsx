'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import AppShell from '@/components/layout/AppShell';
import { PostCard } from '@/components/community/PostCard';
import type { Post } from '@/types/community';
import { Image, BarChart2, Smile, Calendar, MapPin, X } from 'lucide-react';

export default function CommunityPage() {
  const supabase = getSupabaseClient();
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'forYou' | 'following'>('forYou');
  const [newPostContent, setNewPostContent] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function fetchPosts() {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? null;
    if (userId) setCurrentUserId(userId);

    const { data: rawPosts, error: postsError } = await supabase
      .from('posts')
      .select('*, profiles(*)')
      .order('created_at', { ascending: false });

    if (postsError) {
      console.error('Error fetching posts:', postsError.message);
      return;
    }

    if (!rawPosts) return;

    const postIds = rawPosts.map((p: Record<string, any>) => p.id);

    let likesByPost: Record<string, number> = {};
    let likedByMe: Set<string> = new Set();

    if (postIds.length > 0) {
      const { data: likeRows, error: likesError } = await supabase
        .from('likes')
        .select('post_id, user_id')
        .in('post_id', postIds);

      if (likesError) {
        console.error('Error fetching likes:', likesError.message);
      } else if (likeRows) {
        for (const row of likeRows) {
          likesByPost[row.post_id] = (likesByPost[row.post_id] ?? 0) + 1;
          if (userId && row.user_id === userId) {
            likedByMe.add(row.post_id);
          }
        }
      }
    }

    const formatted: Post[] = rawPosts.map((p: Record<string, any>) => ({
      id: p.id,
      content: p.content,
      created_at: p.created_at,
      user_id: p.user_id,
      views_count: p.views_count ?? 0,
      image_url: p.image_url ?? null,
      profiles: p.profiles ?? null,
      likes_count: likesByPost[p.id] ?? 0,
      comments_count: 0,
      user_has_liked: likedByMe.has(p.id),
    }));
    setPosts(formatted);
  }

  useEffect(() => {
    void fetchPosts();
  }, []);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    let userId = currentUserId;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    if (!userId) {
      alert("Please log in to upload images");
      setUploading(false);
      return;
    }

    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage.from('post-images').upload(filePath, file);
    if (!error) {
      const { data } = supabase.storage.from('post-images').getPublicUrl(filePath);
      setImageUrl(data.publicUrl);
    } else {
      alert("Error uploading image: " + error.message);
    }
    setUploading(false);
  }

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    if ((!newPostContent.trim() && !imageUrl) || isSubmitting) return;

    setIsSubmitting(true);

    let userId = currentUserId;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    if (!userId) {
      alert("Please log in to post");
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.from('posts').insert({
      content: newPostContent,
      image_url: imageUrl,
      user_id: userId,
    });

    if (!error) {
      setNewPostContent('');
      setImageUrl(null);
      await fetchPosts();
    } else {
      alert("Error posting: " + error.message);
    }
    setIsSubmitting(false);
  }

  return (
    <AppShell>
      <div className="w-full max-w-full min-h-screen bg-black text-white overflow-x-hidden">
        <div className="flex border-b border-white/10 sticky top-12 bg-black/90 backdrop-blur-md z-40 w-full">
          <button
            onClick={() => setActiveTab('forYou')}
            className={`flex-1 py-3 text-center text-sm font-bold border-b-2 transition ${
              activeTab === 'forYou' ? 'border-[#f5b942] text-white' : 'border-transparent text-white/40'
            }`}
          >
            For You
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`flex-1 py-3 text-center text-sm font-bold border-b-2 transition ${
              activeTab === 'following' ? 'border-[#f5b942] text-white' : 'border-transparent text-white/40'
            }`}
          >
            Following
          </button>
        </div>

        <form onSubmit={handleCreatePost} className="border-b border-white/10 p-4 w-full">
          <textarea
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            placeholder="What is happening?!"
            className="w-full bg-transparent text-sm text-white placeholder:text-white/40 outline-none resize-none min-h-[80px]"
          />

          {imageUrl && (
            <div className="relative mb-3 inline-block">
              <img src={imageUrl} alt="Upload preview" className="max-h-60 rounded-xl object-cover border border-white/10" />
              <button
                type="button"
                onClick={() => setImageUrl(null)}
                className="absolute top-2 right-2 p-1 rounded-full bg-black/70 text-white hover:bg-black"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-white/10 pt-3 mt-2">
            <div className="flex items-center gap-3 text-[#f5b942]">
              <label className="cursor-pointer hover:opacity-80">
                <Image className="h-5 w-5" />
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
              </label>
              <button type="button" className="hover:opacity-80"><BarChart2 className="h-5 w-5" /></button>
              <button type="button" className="hover:opacity-80"><Smile className="h-5 w-5" /></button>
              <button type="button" className="hover:opacity-80"><Calendar className="h-5 w-5" /></button>
              <button type="button" className="hover:opacity-80"><MapPin className="h-5 w-5" /></button>
            </div>

            <button
              type="submit"
              disabled={(!newPostContent.trim() && !imageUrl) || isSubmitting || uploading}
              className="rounded-full bg-[#f5b942] px-5 py-1.5 text-xs font-bold text-black transition disabled:opacity-50"
            >
              {isSubmitting ? 'Posting...' : uploading ? 'Uploading...' : 'Post'}
            </button>
          </div>
        </form>

        <div className="flex items-center justify-between px-4 py-2 text-xs text-white/40 border-b border-white/10 bg-white/[0.01] w-full">
          <span className="flex items-center gap-1.5 font-bold tracking-wider uppercase text-[10px] text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE FEED
          </span>
        </div>

        <div className="divide-y divide-white/10 w-full">
          {posts.length === 0 ? (
            <div className="p-8 text-center text-white/40 text-sm">
              No posts found. Be the first to publish something!
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                supabase={supabase}
                currentUserId={currentUserId}
                fetchPosts={fetchPosts}
              />
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
