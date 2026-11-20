'use client';

import { notify } from '@/lib/notify';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Heart, Repeat2, Share2 } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { authedFetch } from '@/lib/authedFetch';
import { CommentCard, type CommentWithProfile } from '@/components/community/CommentCard';
import { VerifiedBadge } from '@/components/community/icons';
import Avatar from '@/lib/avatarImage';

function formatDate(date: Date) {
  const diff = Date.now() - date.getTime();
  const m = 60 * 1000;
  const h = 60 * m;
  const d = 24 * h;
  if (diff < m) return 'now';
  if (diff < h) return `${Math.floor(diff / m)}m`;
  if (diff < d) return `${Math.floor(diff / h)}h`;
  return `${Math.floor(diff / d)}d`;
}

const REPLY_PAGE = 20;

type AncestorRow = {
  id: string;
  text: string;
  created_at: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};
type Stat = { likes: number; reposts: number; liked: boolean; reposted: boolean };
type MeProfile = { username: string | null; display_name: string | null; avatar_url: string | null; verified?: boolean | null };

const fallbackAvatar = (name: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=111111&color=ffffff&bold=true`;

export default function CommentThreadPage() {
  const params = useParams();
  const router = useRouter();
  const commentId = typeof params?.id === 'string' ? params.id : '';
  const supabase = getSupabaseClient();
  const sentinel = useRef<HTMLDivElement>(null);

  const [comment, setComment] = useState<CommentWithProfile | null>(null);
  const [postAuthorUsername, setPostAuthorUsername] = useState<string | null>(null);
  const [replies, setReplies] = useState<CommentWithProfile[]>([]);
  const [replyCounts, setReplyCounts] = useState<Record<string, number>>({});
  const [stats, setStats] = useState<Record<string, Stat>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [me, setMe] = useState<MeProfile | null>(null);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [repliesLoading, setRepliesLoading] = useState(true);
  const [error, setError] = useState('');
  const [main, setMain] = useState<Stat>({ likes: 0, reposts: 0, liked: false, reposted: false });
  const [busy, setBusy] = useState(false);
  const [sort, setSort] = useState<'relevant' | 'recent' | 'likes'>('relevant');
  const [ancestors, setAncestors] = useState<AncestorRow[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const MAX_LENGTH = me?.verified ? 5000 : 500;

  const goBack = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push('/community');
  }, [router]);

  const loadStats = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id ?? null;
      const [l, r] = await Promise.all([
        supabase.from('comment_likes').select('comment_id, user_id').in('comment_id', ids),
        supabase.from('comment_reposts').select('comment_id, user_id').in('comment_id', ids),
      ]);
      const next: Record<string, Stat> = {};
      for (const id of ids) next[id] = { likes: 0, reposts: 0, liked: false, reposted: false };
      for (const x of (l.data ?? []) as { comment_id: string; user_id: string }[]) {
        const s = next[x.comment_id];
        if (!s) continue;
        s.likes += 1;
        if (x.user_id === uid) s.liked = true;
      }
      for (const x of (r.data ?? []) as { comment_id: string; user_id: string }[]) {
        const s = next[x.comment_id];
        if (!s) continue;
        s.reposts += 1;
        if (x.user_id === uid) s.reposted = true;
      }
      setStats((prev) => ({ ...prev, ...next }));
    },
    [supabase],
  );

  const fetchThread = useCallback(async () => {
    const [sessionRes, commentRes] = await Promise.all([
      supabase.auth.getSession(),
      supabase
        .from('comments')
        .select(`
          id, post_id, parent_comment_id, text, created_at, user_id, image_url,
          profiles ( username, display_name, avatar_url, verified )
        `)
        .eq('id', commentId)
        .maybeSingle(),
    ]);

    const userId = sessionRes.data.session?.user?.id ?? null;
    setCurrentUserId(userId);

    const c = commentRes.data as Record<string, any> | null;
    if (commentRes.error || !c) {
      setError('Comment not found.');
      setLoading(false);
      return;
    }

    setComment({
      id: c.id,
      post_id: c.post_id,
      parent_comment_id: c.parent_comment_id,
      text: c.text,
      created_at: c.created_at,
      user_id: c.user_id,
      image_url: c.image_url ?? null,
      profiles: Array.isArray(c.profiles) ? c.profiles[0] ?? null : c.profiles ?? null,
    });
    setLoading(false);

    const [postRes, profRes, ancRes, lc, rc, ml, mr] = await Promise.all([
      supabase.from('posts').select('profiles(username)').eq('id', c.post_id).maybeSingle(),
      userId
        ? supabase.from('profiles').select('username, display_name, avatar_url, verified').eq('id', userId).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.rpc('get_comment_ancestors', { p_comment_id: commentId }),
      supabase.from('comment_likes').select('*', { count: 'exact', head: true }).eq('comment_id', commentId),
      supabase.from('comment_reposts').select('*', { count: 'exact', head: true }).eq('comment_id', commentId),
      userId
        ? supabase.from('comment_likes').select('user_id').eq('comment_id', commentId).eq('user_id', userId).maybeSingle()
        : Promise.resolve({ data: null }),
      userId
        ? supabase.from('comment_reposts').select('user_id').eq('comment_id', commentId).eq('user_id', userId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const pd = postRes.data as Record<string, any> | null;
    if (pd) {
      const pp = Array.isArray(pd.profiles) ? pd.profiles[0] ?? null : pd.profiles ?? null;
      setPostAuthorUsername(pp?.username ?? null);
    }
    if (profRes.data) setMe(profRes.data as MeProfile);
    setAncestors(ancRes.error ? [] : ((ancRes.data ?? []) as AncestorRow[]));
    setMain({ likes: lc.count ?? 0, reposts: rc.count ?? 0, liked: !!ml.data, reposted: !!mr.data });
  }, [supabase, commentId]);

  const loadReplies = useCallback(
    async (offset: number, append: boolean) => {
      if (append) setLoadingMore(true);
      const { data, error: rpcError } = await supabase.rpc('get_comment_replies', {
        p_comment_id: commentId,
        p_sort: sort,
        p_limit: REPLY_PAGE,
        p_offset: offset,
      });

      let rows: CommentWithProfile[] = [];
      const counts: Record<string, number> = {};

      if (!rpcError && data) {
        for (const r of data as Record<string, any>[]) {
          rows.push({
            id: r.id,
            post_id: r.post_id,
            parent_comment_id: r.parent_comment_id,
            text: r.text,
            created_at: r.created_at,
            user_id: r.user_id,
            image_url: r.image_url ?? null,
            profiles: { username: r.username, display_name: r.display_name, avatar_url: r.avatar_url, verified: r.verified },
          });
          counts[r.id] = Number(r.replies) || 0;
        }
      } else {
        console.error('get_comment_replies failed:', rpcError?.message);
        const { data: fb } = await supabase
          .from('comments')
          .select(`
            id, post_id, parent_comment_id, text, created_at, user_id, image_url,
            profiles ( username, display_name, avatar_url, verified )
          `)
          .eq('parent_comment_id', commentId)
          .order('created_at', { ascending: sort !== 'recent' })
          .range(offset, offset + REPLY_PAGE - 1);
        rows = ((fb ?? []) as Record<string, any>[]).map((r) => ({
          id: r.id,
          post_id: r.post_id,
          parent_comment_id: r.parent_comment_id,
          text: r.text,
          created_at: r.created_at,
          user_id: r.user_id,
          image_url: r.image_url ?? null,
          profiles: Array.isArray(r.profiles) ? r.profiles[0] ?? null : r.profiles ?? null,
        }));
      }

      setReplies((prev) => (append ? [...prev, ...rows.filter((r) => !prev.some((p) => p.id === r.id))] : rows));
      setReplyCounts((prev) => (append ? { ...prev, ...counts } : counts));
      setHasMore(rows.length === REPLY_PAGE);
      setLoadingMore(false);
      setRepliesLoading(false);
      void loadStats(rows.map((r) => r.id));
    },
    [supabase, commentId, sort, loadStats],
  );

  useEffect(() => {
    if (commentId) void loadReplies(0, false);
  }, [commentId, loadReplies]);

  useEffect(() => {
    if (commentId) void fetchThread();
  }, [commentId, fetchThread]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => {
        if (es[0].isIntersecting && hasMore && !loadingMore) {
          void loadReplies(replies.filter((r) => !r.id.startsWith('tmp-')).length, true);
        }
      },
      { rootMargin: '600px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadingMore, loadReplies, replies]);

  async function handleSubmit() {
    const trimmed = content.trim();
    if (!trimmed || submitting || !currentUserId || !comment) return;

    const tempId = 'tmp-' + Date.now();
    const optimistic: CommentWithProfile = {
      id: tempId,
      post_id: comment.post_id,
      parent_comment_id: comment.id,
      text: trimmed,
      created_at: new Date().toISOString(),
      user_id: currentUserId,
      image_url: null,
      profiles: me ? { ...me } : null,
    };
    const rollback = (msg: string) => {
      setReplies((prev) => prev.filter((r) => r.id !== tempId));
      setContent(trimmed);
      setSubmitting(false);
      notify(msg);
    };

    setSubmitting(true);
    setContent('');
    setReplies((prev) => [optimistic, ...prev]);
    try { navigator.vibrate?.(10); } catch {}

    try {
      const modRes = await fetch('/api/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      });
      const modResult = await modRes.json();
      if (modResult.flagged) {
        rollback("This reply violates our content guidelines and can't be posted");
        return;
      }
    } catch (modErr) {
      console.error('Moderation check error:', modErr);
    }

    const { data, error: insertError } = await supabase
      .from('comments')
      .insert({ post_id: comment.post_id, user_id: currentUserId, text: trimmed, parent_comment_id: comment.id })
      .select('id')
      .single();

    if (insertError || !data) {
      const msg = insertError?.message ?? 'Could not post your reply';
      rollback(msg.includes('commenting too fast') ? 'You are commenting too fast — please slow down' : msg);
      return;
    }

    setReplies((prev) => prev.map((r) => (r.id === tempId ? { ...r, id: data.id } : r)));
    setStats((prev) => ({ ...prev, [data.id]: { likes: 0, reposts: 0, liked: false, reposted: false } }));
    setSubmitting(false);

    if (comment.user_id && comment.user_id !== currentUserId) {
      const actor = me?.display_name || me?.username || 'Someone';
      const ownerId = comment.user_id;
      void (async () => {
        try {
          await supabase.from('notifications').insert({
            user_id: ownerId,
            actor_id: currentUserId,
            type: 'comment',
            post_id: comment.post_id,
            read: false,
          });
          await authedFetch('/api/send-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: ownerId,
              title: 'New reply',
              body: actor + ' replied to your comment',
              url: '/comment/' + comment.id,
            }),
          });
        } catch (err) {
          console.error('Notification error:', err);
        }
      })();
    }
  }

  async function toggleMain(kind: 'like' | 'repost') {
    if (!comment || !currentUserId || busy) return;
    setBusy(true);
    try { navigator.vibrate?.(10); } catch {}
    const table = kind === 'like' ? 'comment_likes' : 'comment_reposts';
    const on = kind === 'like' ? main.liked : main.reposted;
    const flip = (v: boolean) =>
      setMain((m) =>
        kind === 'like'
          ? { ...m, liked: v, likes: Math.max(0, m.likes + (v ? 1 : -1)) }
          : { ...m, reposted: v, reposts: Math.max(0, m.reposts + (v ? 1 : -1)) },
      );
    flip(!on);
    const { error: e } = on
      ? await supabase.from(table).delete().eq('comment_id', comment.id).eq('user_id', currentUserId)
      : await supabase.from(table).insert({ comment_id: comment.id, user_id: currentUserId });
    if (e) {
      flip(on);
      notify("Couldn't update, check your connection");
    }
    setBusy(false);
  }

  async function handleCommentShare() {
    if (!comment) return;
    const url = `${window.location.origin}/comment/${comment.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ url, text: comment.text });
      } catch {}
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      notify('Link copied');
    } catch {}
  }

  const header = (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-bbl-border bg-bbl-bg/95 px-2 backdrop-blur-xl">
      <button
        type="button"
        aria-label="Back"
        onClick={goBack}
        className="flex h-11 w-11 items-center justify-center rounded-full text-bbl-text transition active:scale-90 active:bg-bbl-text/5"
      >
        <ArrowLeft className="h-[22px] w-[22px]" aria-hidden />
      </button>
      <h1 className="text-[17px] font-bold text-bbl-text">Thread</h1>
    </header>
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-bbl-bg text-bbl-text">
        <div className="mx-auto max-w-2xl">
          {header}
          <div className="animate-pulse space-y-3 p-4">
            <div className="flex gap-3">
              <div className="h-10 w-10 rounded-full bg-bbl-text/5" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 w-32 rounded bg-bbl-text/5" />
                <div className="h-3 w-full rounded bg-bbl-text/5" />
                <div className="h-3 w-3/4 rounded bg-bbl-text/5" />
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !comment) {
    return (
      <main className="min-h-screen bg-bbl-bg text-bbl-text">
        <div className="mx-auto max-w-2xl">
          {header}
          <div className="p-10 text-center text-sm text-bbl-muted">
            <p>{error || 'Comment not found.'}</p>
            <button type="button" onClick={goBack} className="mt-4 rounded-full bg-bbl-accent px-4 py-2 text-sm font-bold text-black active:scale-95">
              Go back
            </button>
          </div>
        </div>
      </main>
    );
  }

  const username = comment.profiles?.username || 'user';
  const displayName = comment.profiles?.display_name || username;
  const avatar = comment.profiles?.avatar_url || fallbackAvatar(displayName);
  const created = new Date(comment.created_at);
  const lastAncestor = ancestors.length ? ancestors[ancestors.length - 1] : null;

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-hidden bg-bbl-bg text-bbl-text">
      <div className="mx-auto min-h-screen max-w-2xl">
        {header}

        {ancestors.map((a) => {
          const aName = a.display_name || a.username || 'user';
          return (
            <Link key={a.id} href={`/comment/${a.id}`} className="flex gap-2.5 px-3 pt-3 active:bg-bbl-text/[0.03]">
              <div className="flex flex-col items-center">
                <Avatar src={a.avatar_url || fallbackAvatar(aName)} alt={aName} size={40} className="h-10 w-10 shrink-0 rounded-full object-cover" />
                <div className="mt-1 w-0.5 flex-1 rounded bg-bbl-border" />
              </div>
              <div className="min-w-0 flex-1 pb-3">
                <div className="flex items-center gap-1 leading-tight">
                  <span className="truncate text-[15px] font-bold">{aName}</span>
                  <span className="truncate text-[14px] text-bbl-muted">@{a.username || 'user'}</span>
                  <span className="text-[14px] text-bbl-muted">·</span>
                  <time className="shrink-0 text-[14px] text-bbl-muted">{formatDate(new Date(a.created_at))}</time>
                </div>
                <p className="mt-0.5 break-words text-[15px] leading-[21px]">{a.text}</p>
              </div>
            </Link>
          );
        })}

        <div className="px-3 pt-3">
          <div className="flex gap-2.5">
            <Avatar src={avatar} alt={displayName} size={40} className="h-10 w-10 shrink-0 rounded-full object-cover" />
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-center gap-1 leading-tight">
                <span className="truncate text-[15px] font-bold">{displayName}</span>
                {comment.profiles?.verified && <VerifiedBadge size={14} />}
                <span className="truncate text-[14px] text-bbl-muted">@{username}</span>
              </div>
              {(lastAncestor?.username || postAuthorUsername) && (
                <Link href={`/post/${comment.post_id}`} className="text-[13px] text-bbl-muted">
                  Replying to <span className="text-bbl-accent">@{lastAncestor?.username || postAuthorUsername}</span>
                </Link>
              )}
            </div>
          </div>

          <p className="mt-2 whitespace-pre-wrap break-words text-[17px] leading-[24px]">{comment.text}</p>
          {comment.image_url && (
            <div className="mt-3 overflow-hidden rounded-xl border border-bbl-border">
              <img src={comment.image_url} alt="Comment attachment" className="max-h-96 w-full object-cover" decoding="async" />
            </div>
          )}

          <div className="mt-3 border-t border-bbl-border pt-2.5 text-[14px] text-bbl-muted">
            {created.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            {' · '}
            {created.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>

          {(main.likes > 0 || main.reposts > 0) && (
            <div className="mt-2.5 flex gap-5 border-t border-bbl-border py-2.5 text-[14px] text-bbl-muted">
              {main.reposts > 0 && <span><b className="text-bbl-text">{main.reposts}</b> {main.reposts === 1 ? 'Repost' : 'Reposts'}</span>}
              {main.likes > 0 && <span><b className="text-bbl-text">{main.likes}</b> {main.likes === 1 ? 'Like' : 'Likes'}</span>}
            </div>
          )}

          <div className="flex items-center justify-around border-y border-bbl-border py-1 text-bbl-muted">
            <button type="button" aria-label="Repost" onClick={() => void toggleMain('repost')} className={`flex h-11 w-11 items-center justify-center rounded-full transition active:scale-90 ${main.reposted ? 'text-bbl-accent' : ''}`}>
              <Repeat2 className="h-5 w-5" />
            </button>
            <button type="button" aria-label="Like" onClick={() => void toggleMain('like')} className={`flex h-11 w-11 items-center justify-center rounded-full transition active:scale-90 ${main.liked ? 'text-bbl-like' : ''}`}>
              <Heart className={`h-5 w-5 ${main.liked ? 'fill-bbl-like' : ''}`} />
            </button>
            <button type="button" aria-label="Share" onClick={() => void handleCommentShare()} className="flex h-11 w-11 items-center justify-center rounded-full transition active:scale-90">
              <Share2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        {(replies.length > 1 || hasMore || sort !== 'relevant') && (
          <div className="flex items-center gap-1 border-b border-bbl-border px-3 py-2">
            {([['relevant', 'Relevant'], ['recent', 'Recent'], ['likes', 'Likes']] as const).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setSort(k)}
                className={`min-h-[36px] rounded-full px-3 text-[13px] font-semibold transition ${sort === k ? 'bg-bbl-text text-bbl-bg' : 'text-bbl-muted'}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="pb-28">
          {repliesLoading ? (
            <div className="animate-pulse space-y-4 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-10 w-10 rounded-full bg-bbl-text/5" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3 w-28 rounded bg-bbl-text/5" />
                    <div className="h-3 w-3/4 rounded bg-bbl-text/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : replies.length === 0 ? (
            <p className="py-10 text-center text-sm text-bbl-muted">No replies yet — be the first</p>
          ) : (
            replies.map((r) => (
              <div key={r.id} className={r.id.startsWith('tmp-') ? 'pointer-events-none opacity-60' : ''}>
                <CommentCard
                  comment={r}
                  replyCount={replyCounts[r.id] ?? 0}
                  supabase={supabase}
                  currentUserId={currentUserId}
                  postOwnerId={null}
                  stat={stats[r.id]}
                  onDeleted={() => setReplies((prev) => prev.filter((x) => x.id !== r.id))}
                />
              </div>
            ))
          )}
          <div ref={sentinel} className="h-4" />
          {loadingMore && <div className="p-4 text-center text-xs text-bbl-muted">Loading…</div>}
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-30 mx-auto max-w-2xl border-t border-bbl-border bg-bbl-bg px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
          {currentUserId ? (
            <div className="flex gap-3">
              {me?.avatar_url ? (
                <img src={me.avatar_url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bbl-accent text-xs font-bold text-white">
                  {me?.display_name ? me.display_name[0].toUpperCase() : 'B'}
                </div>
              )}
              <div className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 rounded-full border border-bbl-border bg-bbl-text/[0.05] px-3 py-1 transition-all duration-200 focus-within:border-bbl-accent/40">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleSubmit();
                    }
                  }}
                  rows={1}
                  maxLength={MAX_LENGTH}
                  placeholder="Post your reply"
                  className="flex-1 resize-none bg-transparent px-1 py-2.5 text-base leading-5 text-bbl-text outline-none placeholder:text-bbl-muted"
                />
                {content.trim() ? (
                  <button type="button" onClick={() => void handleSubmit()} disabled={submitting} className="h-11 shrink-0 px-2 text-sm font-semibold text-bbl-accent active:opacity-60 disabled:opacity-50">
                    {submitting ? '...' : 'Reply'}
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="py-2 text-center text-sm text-bbl-muted">Sign in to reply</p>
          )}
        </div>
      </div>
    </main>
  );
}
