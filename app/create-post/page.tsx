'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';

export default function CreatePostPage() {
  const router = useRouter();

  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!content.trim()) {
      setError('Write something before posting.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    const supabase = getSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError('You must be signed in to create a post.');
      setSaving(false);
      return;
    }

    const { error: postError } = await supabase.from('posts').insert({
      user_id: user.id,
      content: content.trim(),
    });

    if (postError) {
      setError(postError.message);
      setSaving(false);
      return;
    }

    setContent('');
    setSuccess('Post published successfully.');
    setSaving(false);

    setTimeout(() => {
      router.push('/dashboard');
      router.refresh();
    }, 700);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="rounded-[2rem] border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <div className="mb-8">
            <p className="text-sm uppercase tracking-[0.25em] text-amber-300">
              Black Bull Studio
            </p>

            <h1 className="mt-3 text-3xl font-semibold text-white">
              Create Post
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Share something with your community.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="content"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                What is on your mind?
              </label>

              <textarea
                id="content"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Write your post..."
                rows={7}
                maxLength={5000}
                className="w-full resize-none rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-amber-300"
              />

              <div className="mt-2 text-right text-xs text-slate-500">
                {content.length}/5000
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Publishing...' : 'Publish Post'}
            </button>

            {error && (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
                {success}
              </div>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}
