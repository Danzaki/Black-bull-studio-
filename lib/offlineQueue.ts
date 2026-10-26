import { get, set } from 'idb-keyval';

const KEY = 'bbl-offline-queue';

export type QueuedAction = {
  id: string;
  type: 'like' | 'unlike' | 'bookmark' | 'unbookmark' | 'follow' | 'unfollow';
  postId: string;
  userId: string;
  at: number;
};

const OPPOSITE: Record<QueuedAction['type'], QueuedAction['type']> = {
  like: 'unlike',
  unlike: 'like',
  bookmark: 'unbookmark',
  unbookmark: 'bookmark',
  follow: 'unfollow',
  unfollow: 'follow',
};

let flushing = false;

export async function enqueueAction(a: Omit<QueuedAction, 'id' | 'at'>) {
  try {
    const q = (await get<QueuedAction[]>(KEY)) ?? [];
    const idx = q.findIndex(
      (x) => x.postId === a.postId && x.userId === a.userId && x.type === OPPOSITE[a.type]
    );
    if (idx >= 0) q.splice(idx, 1);
    else q.push({ ...a, id: crypto.randomUUID(), at: Date.now() });
    await set(KEY, q);
  } catch (e) {
    console.error('Enqueue failed:', e);
  }
}

async function run(supabase: any, a: QueuedAction) {
  switch (a.type) {
    case 'like':
      return supabase.from('likes').insert({ post_id: a.postId, user_id: a.userId });
    case 'unlike':
      return supabase.from('likes').delete().eq('post_id', a.postId).eq('user_id', a.userId);
    case 'bookmark':
      return supabase.from('bookmarks').insert({ post_id: a.postId, user_id: a.userId });
    case 'unbookmark':
      return supabase.from('bookmarks').delete().eq('post_id', a.postId).eq('user_id', a.userId);
    // for follow/unfollow, postId holds the id of the user being followed
    case 'follow':
      return supabase.from('follows').insert({ follower_id: a.userId, following_id: a.postId });
    case 'unfollow':
      return supabase.from('follows').delete().eq('follower_id', a.userId).eq('following_id', a.postId);
  }
}

export async function flushQueue(supabase: any, userId: string) {
  if (flushing) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  flushing = true;
  try {
    const q = (await get<QueuedAction[]>(KEY)) ?? [];
    if (q.length === 0) return;
    const remaining: QueuedAction[] = [];
    let stopped = false;
    for (const a of q) {
      if (stopped || a.userId !== userId) {
        remaining.push(a);
        continue;
      }
      try {
        const { error } = await run(supabase, a);
        if (error && !error.code) {
          // network error: keep and try again later
          remaining.push(a);
          stopped = true;
        } else if (error && error.code !== '23505') {
          console.error('Dropping queued action:', a.type, error.message);
        }
      } catch {
        remaining.push(a);
        stopped = true;
      }
    }
    await set(KEY, remaining);
  } finally {
    flushing = false;
  }
}
