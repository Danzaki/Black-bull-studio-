'use client';
import React, { useState } from 'react';
import { Image, Wand2, Send, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface CreatePostProps {
  onPostCreated?: () => void;
}

export default function CreatePostCard({ onPostCreated }: CreatePostProps) {
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleAiPrompt() {
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/ai-meme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: content }),
      });
      const data = await res.json();
      if (data.meme) {
        setContent(data.meme);
      }
    } catch (err) {
      console.error('Failed to generate meme:', err);
    } finally {
      setIsAiLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if ((!content.trim() && !imageUrl) || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData?.user?.id || null;

      const { error } = await supabase
        .from('posts')
        .insert([
          {
            user_id: currentUserId,
            content: content.trim(),
            image_url: imageUrl,
          },
        ]);

      if (error) {
        alert(`Supabase Error: ${error.message}`);
        console.error('Supabase Error Details:', error);
      } else {
        setContent('');
        setImageUrl(null);
        if (onPostCreated) onPostCreated();
      }
    } catch (e: any) {
      alert(`Unexpected Error: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-zinc-800/80 bg-zinc-950 p-4 shadow-2xl">
      <div className="flex gap-3">
        <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center font-bold text-black text-sm flex-shrink-0">
          B
        </div>

        <div className="flex-1 space-y-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What is happening?..."
            rows={3}
            className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-600 outline-none resize-none leading-relaxed"
          />

          {imageUrl && (
            <div className="relative rounded-xl overflow-hidden border border-zinc-800 max-h-60 bg-black">
              <img src={imageUrl} alt="Post Attachment" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setImageUrl(null)}
                className="absolute top-2 right-2 bg-black/80 hover:bg-black text-white p-1.5 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-zinc-800/60 pt-3">
            <div className="flex items-center gap-1.5">
              <label className="p-2 rounded-xl text-zinc-400 hover:text-amber-400 hover:bg-zinc-900 cursor-pointer transition flex items-center gap-1.5 text-xs">
                <Image className="w-4 h-4" />
                <span>Media</span>
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>

              <button
                type="button"
                onClick={handleAiPrompt}
                disabled={isAiLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition disabled:opacity-40"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>{isAiLoading ? 'Generating...' : 'AI Assist'}</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={(!content.trim() && !imageUrl) || isSubmitting}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-5 py-2 rounded-full transition active:scale-95 disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Posting...' : 'Post'}</span>
              <Send className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
