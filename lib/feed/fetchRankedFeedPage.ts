import { fetchFeedPage } from './fetchFeedPage';
import { rankItems, RANK, type Relations } from './rank';
import { FEED_PAGE_SIZE, type FeedPage } from './types';

const POOL = 100;
const CACHE_MS = 2 * 60_000;
let cached: { at: number; pool: FeedPage; rel: Relations } | null = null;

async function relations(supabase: any, me: string | null): Promise<Relations> {
  const following = new Set<string>();
  const mutuals = new Set<string>();
  if (!me) return { following, mutuals, me };
  try {
    const [a, b] = await Promise.all([
      supabase.from('follows').select('following_id').eq('follower_id', me),
      supabase.from('follows').select('follower_id').eq('following_id', me),
    ]);
    for (const r of (a.data ?? []) as { following_id: string }[]) following.add(r.following_id);
    for (const r of (b.data ?? []) as { follower_id: string }[]) {
      if (following.has(r.follower_id)) mutuals.add(r.follower_id);
    }
  } catch {}
  return { following, mutuals, me };
}

export async function fetchRankedFeedPage(supabase: any, opts: { cursor: string | null }): Promise<FeedPage> {
  const { cursor } = opts;
  if (cursor && cursor.startsWith('t:')) {
    return fetchFeedPage(supabase, { tab: 'forYou', cursor: cursor.slice(2) });
  }
  const offset = cursor && cursor.startsWith('r:') ? Math.max(0, parseInt(cursor.slice(2), 10) || 0) : 0;
  const since = new Date(Date.now() - RANK.poolHours * 3_600_000).toISOString();

  let entry = offset > 0 && cached && Date.now() - cached.at < CACHE_MS ? cached : null;
  if (!entry) {
    const pool = await fetchFeedPage(supabase, { tab: 'forYou', cursor: null, pageSize: POOL, since });
    const rel = await relations(supabase, pool.userId);
    entry = { at: Date.now(), pool, rel };
    cached = entry;
  }

  const ranked = rankItems(entry.pool.items, entry.pool.counts, entry.rel);
  const end = offset + FEED_PAGE_SIZE;
  const nextCursor = end < ranked.length ? 'r:' + end : 't:' + (entry.pool.nextCursor ?? since);
  return {
    items: ranked.slice(offset, end),
    nextCursor,
    reposted: entry.pool.reposted,
    bookmarked: entry.pool.bookmarked,
    counts: entry.pool.counts,
    userId: entry.pool.userId,
  };
}
