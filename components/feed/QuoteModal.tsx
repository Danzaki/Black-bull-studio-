'use client';
import React, { useState } from 'react';
import { X, Send } from 'lucide-react';
import { Post } from '@/types/database';
import { supabase } from '@/lib/supabase';

interface QuoteModalProps {
  targetPost: Post;
  onClose: () => void;
  onSuccess: () => void;
}

export default function QuoteModal({ targetPost, onClose, onSuccess }: QuoteModalProps) {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || submitting) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('posts').insert([
        {
          author_name: 'Ansem Bull',
          username: 'Danzakine0',
          content: `${content.trim()}\n\n> Quoting @${targetPost.username}: "${targetPost.content}"`,
        },
      ]);

      if (!error) {
        onSuccess();
      }
    } catch (err) {
      console.error('Error creating quote post:', err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#f7f5f2]/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-stone-800 rounded-2xl w-full max-w-lg p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-stone-800 pb-2">
          <h2 className="text-sm font-bold text-stone-100">Quote Post</h2>
          <button onClick={onClose} className="p-1 rounded-full text-stone-400 hover:text-stone-100 hover:bg-stone-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add a comment..."
            rows={3}
            className="w-full bg-transparent text-sm text-stone-100 placeholder-stone-500 border-none outline-none resize-none focus:ring-0"
          />

          <div className="p-3 border border-stone-800 rounded-xl bg-stone-50 text-xs space-y-1">
            <div className="font-bold text-stone-300">{targetPost.author_name} <span className="text-stone-500 font-normal">@{targetPost.username}</span></div>
            <p className="text-stone-400 line-clamp-2">{targetPost.content}</p>
          </div>

          <div className="flex justify-end pt-2 border-t border-stone-900">
            <button
              type="submit"
              disabled={!content.trim() || submitting}
              className="bg-orange-700 hover:bg-orange-700 text-black font-bold text-xs px-4 py-1.5 rounded-full transition disabled:opacity-40 flex items-center gap-1"
            >
              <span>{submitting ? 'Quoting...' : 'Quote'}</span>
              <Send className="w-3 h-3" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
