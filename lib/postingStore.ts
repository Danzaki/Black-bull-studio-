import { getSupabaseClient } from '@/lib/supabaseClient';
import { authedFetch } from '@/lib/authedFetch';
import { extractMentionedUsernames } from '@/lib/parseMentions';
import { invalidateFeedCache } from '@/lib/feedCache';

export type PostPayload = {
  text: string;
  imageUrls: string[];
  tokenMint: string | null;
  poll: { options: string[]; minutes: number } | null;
};

export type PostingState = {
  status: 'idle' | 'posting' | 'done' | 'failed';
  postId?: string;
  error?: string;
  fatal?: boolean;
};

type Job = PostPayload & {
  id: string;
  userId?: string;
  inserted: boolean;
  pollDone: boolean;
  mentionsDone: boolean;
};

const IDLE: PostingState = { status: 'idle' };
let state: PostingState = IDLE;
let job: Job | null = null;
let running = false;
const listeners = new Set<() => void>();

function setState(s: PostingState) {
  state = s;
  listeners.forEach((l) => l());
}

export function subscribePosting(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
export const getPostingState = () => state;
export const getServerPostingState = () => IDLE;

const NET_MSG = "No connection. We'll retry when you're back online.";

async function run() {
  if (!job || running) return;
  running = true;
  const j = job;
  setState({ status: 'posting' });
  try {
    const supabase = getSupabaseClient();

    if (!j.inserted) {
      if (j.text) {
        try {
          const r = await fetch('/api/moderate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: j.text }),
          });
          const m = await r.json();
          if (m.flagged) {
            setState({ status: 'failed', fatal: true, error: "This post violates our content guidelines and can't be posted." });
            return;
          }
        } catch {}
      }

      const { data: { user }, error: uErr } = await supabase.auth.getUser();
      if (!user) {
        setState({
          status: 'failed',
          fatal: !uErr,
          error: uErr ? NET_MSG : 'You must be signed in to post.',
        });
        return;
      }
      j.userId = user.id;

      const { error } = await supabase.from('posts').insert({
        id: j.id,
        content: j.text,
        image_url: j.imageUrls[0] ?? null,
        image_urls: j.imageUrls,
        user_id: user.id,
        token_mint: j.tokenMint,
      });
      if (error && error.code !== '23505') {
        const fast = error.message?.includes('posting too fast');
        setState({
          status: 'failed',
          error: !error.code ? NET_MSG : fast ? 'You are posting too fast. Please slow down.' : error.message,
        });
        return;
      }
      j.inserted = true;
    }

    if (j.poll && !j.pollDone) {
      const { error } = await supabase.rpc('create_poll', {
        p_post_id: j.id,
        p_options: j.poll.options,
        p_minutes: j.poll.minutes,
      });
      if (error) {
        if (!error.code) {
          setState({ status: 'failed', error: NET_MSG });
          return;
        }
        await supabase.from('posts').delete().eq('id', j.id);
        j.inserted = false;
        setState({ status: 'failed', error: 'Could not create the poll. Please try again.' });
        return;
      }
      j.pollDone = true;
    }

    if (!j.mentionsDone) {
      try {
        const names = extractMentionedUsernames(j.text);
        if (names.length > 0 && j.userId) {
          const uid = j.userId;
          const { data: mentioned } = await supabase.from('profiles').select('id').in('username', names);
          await Promise.allSettled(
            (mentioned ?? [])
              .filter((m: { id: string }) => m.id !== uid)
              .map(async (m: { id: string }) => {
                await supabase.from('notifications').insert({
                  user_id: m.id,
                  actor_id: uid,
                  type: 'mention',
                  post_id: j.id,
                  read: false,
                });
                await authedFetch('/api/send-notification', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    userId: m.id,
                    title: 'You were mentioned',
                    body: 'Someone mentioned you in a post',
                    url: '/post/' + j.id,
                  }),
                });
              })
          );
        }
      } catch (e) {
        console.error('Mention error:', e);
      }
      j.mentionsDone = true;
    }

    try { localStorage.removeItem('bb_post_draft'); } catch {}
    invalidateFeedCache();
    job = null;
    setState({ status: 'done', postId: j.id });
  } catch {
    setState({ status: 'failed', error: NET_MSG });
  } finally {
    running = false;
  }
}

export function startPosting(p: PostPayload) {
  if (running) return;
  job = { ...p, id: crypto.randomUUID(), inserted: false, pollDone: false, mentionsDone: false };
  void run();
}

export function retryPosting() {
  if (state.status === 'failed' && !state.fatal) void run();
}

export function discardPosting() {
  if (running) return;
  job = null;
  setState(IDLE);
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => retryPosting());
}
