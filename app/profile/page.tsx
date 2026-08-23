'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';
import AppShell from '@/components/layout/AppShell';
import { PostCard } from '@/components/community/PostCard';
import EditProfileModal from '@/components/profile/EditProfileModal';
import { MapPin, Calendar, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { Post, Profile } from '@/types/community';

export default function ProfilePage() {
  const supabase = getSupabaseClient();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'likes'>('posts');
  const [editOpen, setEditOpen] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      setCurrentUserId(user.id);

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      setProfile(prof);

      const { count: followers } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', user.id);

      const { count: following } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', user.id);

      setFollowersCount(followers ?? 0);
      setFollowingCount(following ?? 0);

      const { data: userPosts } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const postIds = (userPosts || []).map((p: Record<string, any>) => p.id);
      let commentsByPost: Record<string, number> = {};
      let likesByPost: Record<string, number> = {};
      let likedByMe: Set<string> = new Set();

      if (postIds.length > 0) {
        const [commentsRes, likesRes] = await Promise.all([
          supabase.from('comments').select('post_id').in('post_id', postIds),
          supabase.from('likes').select('post_id, user_id').in('post_id', postIds),
        ]);

        for (const row of (commentsRes.data ?? []) as { post_id: string }[]) {
          commentsByPost[row.post_id] = (commentsByPost[row.post_id] ?? 0) + 1;
        }
        for (const row of (likesRes.data ?? []) as { post_id: string; user_id: string }[]) {
          likesByPost[row.post_id] = (likesByPost[row.post_id] ?? 0) + 1;
          if (row.user_id === user.id) likedByMe.add(row.post_id);
        }
      }

      const formattedPosts: Post[] = (userPosts || []).map((p: Record<string, any>) => ({
        id: p.id,
        content: p.content,
        created_at: p.created_at,
        user_id: p.user_id,
        views_count: p.views_count ?? 0,
        image_url: p.image_url ?? null,
        profiles: prof,
        likes_count: likesByPost[p.id] ?? 0,
        comments_count: commentsByPost[p.id] ?? 0,
        user_has_liked: likedByMe.has(p.id),
      }));

      setPosts(formattedPosts);
    }
    void loadProfile();
  }, [supabase, router]);

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl min-h-screen bg-black text-white border-x border-white/10">
        <div className="sticky top-0 z-10 flex items-center gap-4 bg-black/80 backdrop-blur-md px-4 py-3">
          <button onClick={() => router.back()} className="rounded-full p-2 hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">{profile?.display_name || 'User'}</h1>
            <p className="text-xs text-white/40">{posts.length} posts</p>
          </div>
        </div>

        <div className="h-48 w-full bg-gradient-to-r from-yellow-600 to-yellow-400 relative">
          <div className="absolute -bottom-16 left-4">
             <div className="h-32 w-32 rounded-full border-4 border-black bg-neutral-800 overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[#f5b942] text-4xl font-black text-black">
                    {profile?.display_name?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
             </div>
          </div>
        </div>

        <div className="flex justify-end p-4 mt-2">
            <button
              onClick={() => setEditOpen(true)}
              className="rounded-full border border-white/20 px-4 py-1.5 text-sm font-bold hover:bg-white/10"
            >
                Edit Profile
            </button>
        </div>

        <div className="px-4 pb-4">
          <h2 className="text-xl font-bold">{profile?.display_name}</h2>
          <p className="text-white/50 text-sm mb-3">@{profile?.username}</p>

          {profile?.bio && (
            <p className="text-sm text-white/80 mb-3 whitespace-pre-wrap">{profile.bio}</p>
          )}

          <div className="flex items-center gap-4 text-sm text-white/50 mb-3">
            <div className="flex items-center gap-1"><MapPin className="h-4 w-4" /> Nigeria</div>
            <div className="flex items-center gap-1"><Calendar className="h-4 w-4" /> Joined August 2026</div>
          </div>

          <div className="flex gap-4 text-sm">
            <Link href={`/users/${profile?.username}/following`} className="hover:underline">
              <span className="font-bold text-white">{followingCount}</span> <span className="text-white/50">Following</span>
            </Link>
            <Link href={`/users/${profile?.username}/followers`} className="hover:underline">
              <span className="font-bold text-white">{followersCount}</span> <span className="text-white/50">Followers</span>
            </Link>
          </div>
        </div>

        <div className="flex border-b border-white/10 mt-4">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 py-3 text-center text-sm font-bold border-b-2 transition ${
              activeTab === 'posts' ? 'border-[#f5b942] text-white' : 'border-transparent text-white/40'
            }`}
          >
            Posts ({posts.length})
          </button>
          <button
            onClick={() => setActiveTab('likes')}
            className={`flex-1 py-3 text-center text-sm font-bold border-b-2 transition ${
              activeTab === 'likes' ? 'border-[#f5b942] text-white' : 'border-transparent text-white/40'
            }`}
          >
            Likes
          </button>
        </div>

        <div className="divide-y divide-white/10">
          {posts.length === 0 ? (
            <div className="p-8 text-center text-white/40">
              No posts published yet.
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={{
                  ...post,
                  user_has_liked: post.user_has_liked ?? false,
                  likes_count: post.likes_count ?? 0,
                }}
                supabase={supabase}
                currentUserId={currentUserId}
                fetchPosts={() => {}}
              />
            ))
          )}
        </div>
      </div>

      {editOpen && profile && currentUserId && (
        <EditProfileModal
          profile={profile}
          userId={currentUserId}
          supabase={supabase}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => setProfile(updated)}
        />
      )}
    </AppShell>
  );
}
