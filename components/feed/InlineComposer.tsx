'use client';
import React, { useState } from 'react';
import { Image, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface InlineComposerProps {
  onPostCreated?: () => void;
}

export default function InlineComposer({ onPostCreated }: InlineComposerProps) {
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || submitting) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from('posts').insert([
        {
          user_id: user?.id ?? null,
          content: content.trim(),
          image_url: imageUrl.trim() || null,
        },
      ]);

      if (!error) {
        setContent('');
        setImageUrl('');
        if (onPostCreated) onPostCreated();
      }
    } catch (err) {
      console.error('Error creating post:', err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-4 border-b border-zinc-800/80 bg-black">
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What is happening?!"
          rows={3}
          className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 border-none outline-none resize-none focus:ring-0"
        />
        {imageUrl && (
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Image URL"
            className="w-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 px-3 py-1.5 rounded-lg outline-none"
          />
        )}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-900">
          <button
            type="button"
            onClick={() => setImageUrl(imageUrl ? '' : 'https://')}
            className="text-amber-500 hover:text-amber-400 p-1 rounded-full hover:bg-zinc-900 transition"
          >
            <Image className="w-4 h-4" />
          </button>
          <button
            type="submit"
            disabled={!content.trim() || submitting}
            className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-4 py-1.5 rounded-full transition disabled:opacity-40 flex items-center gap-1"
          >
            <span>{submitting ? 'Posting...' : 'Post'}</span>
            <Send className="w-3 h-3" />
          </button>
        </div>
      </form>
    </div>
  );
}
