import type { SupabaseClient } from '@supabase/supabase-js';

type Handler = () => void;

const handlers = new Map<string, Set<Handler>>();
let channel: ReturnType<SupabaseClient['channel']> | null = null;
let activeClient: SupabaseClient | null = null;

function ensureChannel(supabase: SupabaseClient) {
  if (channel) return;
  activeClient = supabase;
  channel = supabase
    .channel('comments-all')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, (payload: any) => {
      const postId = payload?.new?.post_id ?? payload?.old?.post_id;
      if (postId) {
        handlers.get(postId)?.forEach((h) => h());
      } else {
        handlers.forEach((set) => set.forEach((h) => h()));
      }
    })
    .subscribe((status: string) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn('comments realtime:', status);
      }
    });
}

export function subscribeComments(supabase: SupabaseClient, postId: string, handler: Handler) {
  ensureChannel(supabase);
  let set = handlers.get(postId);
  if (!set) {
    set = new Set();
    handlers.set(postId, set);
  }
  set.add(handler);

  return () => {
    const s = handlers.get(postId);
    if (s) {
      s.delete(handler);
      if (s.size === 0) handlers.delete(postId);
    }
    if (handlers.size === 0 && channel && activeClient) {
      activeClient.removeChannel(channel);
      channel = null;
      activeClient = null;
    }
  };
}
