"use client";

import React, { useEffect, useState, useCallback } from "react";
import { MessageSquare, Heart, Share2, Award, Plus } from "lucide-react";

interface Post {
  id: string;
  author: string;
  avatar: string;
  content: string;
  likes: number;
  comments: number;
  timestamp: string;
}

export default function CommunityPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    try {
      // Demo mock posts
      const demoPosts: Post[] = [
        {
          id: "1",
          author: "SolanaWhale99",
          avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
          content: "Just sniped 10 SOL of the new launchpad pool! Black Bull Terminal execution is blazing fast 🚀",
          likes: 24,
          comments: 5,
          timestamp: "10m ago",
        },
      ];
      setPosts(demoPosts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return (
    <main className="min-h-screen bg-black text-white p-4 max-w-4xl mx-auto space-y-4 font-mono">
      <header className="flex items-center justify-between border-b border-zinc-900 pb-3">
        <h1 className="text-lg font-bold text-emerald-400">COMMUNITY FEED</h1>
        <button className="flex items-center gap-1 bg-emerald-500 text-black px-3 py-1.5 rounded font-bold text-xs">
          <Plus className="h-4 w-4" /> New Post
        </button>
      </header>

      {loading ? (
        <div className="text-center text-xs text-zinc-500 py-10">Loading community feed...</div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div key={post.id} className="p-4 rounded-xl border border-zinc-900 bg-zinc-950 space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src={post.avatar}
                  alt={`${post.author}'s avatar`}
                  className="h-8 w-8 rounded-full border border-zinc-800"
                />
                <div>
                  <div className="text-xs font-bold text-white">{post.author}</div>
                  <div className="text-[10px] text-zinc-500">{post.timestamp}</div>
                </div>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">{post.content}</p>
              <div className="flex items-center gap-4 text-xs text-zinc-500 pt-1 border-t border-zinc-900">
                <button className="flex items-center gap-1 hover:text-emerald-400">
                  <Heart className="h-3.5 w-3.5" /> {post.likes}
                </button>
                <button className="flex items-center gap-1 hover:text-emerald-400">
                  <MessageSquare className="h-3.5 w-3.5" /> {post.comments}
                </button>
                <button className="flex items-center gap-1 hover:text-emerald-400">
                  <Share2 className="h-3.5 w-3.5" /> Share
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
