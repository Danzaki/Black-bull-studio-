import type { Post, Profile } from '@/types/community';
import { FEED_PAGE_SIZE, type FeedItem, type FeedPage, type FeedTab } from './types';

type Row = Record<string, any>;

export async function fetchFeedPage(
  supabase: any,
  opts: { tab: FeedTab; cursor: string | null }
): Promise<FeedPage> {
  const { tab, cursor } = opts;
  const empty: FeedPage = { items: [], nextCursor: null, reposted: [], bookmarked: [], counts: {}, userId: null };

  const { data: { session } } = await supabase.auth.getSession();
  const userId: string | null = session?.user?.id ?? null;

  let followingIds: string[] = [];
  if (tab === 'following') {
    if (!userId) return { ...empty, userId };
    const { data: rows } = await supabase.from('follows').select('following_id').eq('follower_id', userId);
    followingIds = (rows ?? []).map((r: { following_id: string }) => r.following_id);
    if (followingIds.length === 0) return { ...empty, userId };
  }

  let postsQuery = supabase
    .from('posts')
    .select('*, profiles(*)')
    .order('created_at', { ascending: false })
    .limit(FEED_PAGE_SIZE);
  if (cursor) postsQuery = postsQuery.lt('created_at', cursor);

  let repostsQuery = supabase
    .from('reposts')
    .select('id, post_id, user_id, quote_content, created_at, posts(*, profiles(*))')
    .order('created_at', { ascending: false })
    .limit(50);

  if (tab === 'following') {
    postsQuery = postsQuery.in('user_id', followingIds);
    repostsQuery = repostsQuery.in('user_id', followingIds);
  }

  const [postsRes, repostsRes] = await Promise.all([
    postsQuery,
    cursor ? Promise.resolve({ data: [], error: null }) : repostsQuery,
  ]);
  if (postsRes.error) throw new Error(postsRes.error.message);

  const basePosts = (postsRes.data ?? []) as Row[];
  const repostRows = (repostsRes.data ?? []) as Row[];
  const hasMore = basePosts.length === FEED_PAGE_SIZE;
  const nextCursor = hasMore ? basePosts[basePosts.length - 1].created_at : null;

  const reposterIds = Array.from(new Set(repostRows.map((r) => r.user_id).filter(Boolean)));
  const reposterPromise: any =
    reposterIds.length > 0
      ? supabase.from('profiles').select('*').in('id', reposterIds)
      : Promise.resolve({ data: [], error: null });

  const allPostsById: Record<string, Row> = {};
  for (const p of basePosts) allPostsById[p.id] = p;
  for (const r of repostRows) {
    if (r.posts && !allPostsById[r.posts.id]) allPostsById[r.posts.id] = r.posts;
  }
  const postIds = Object.keys(allPostsById);

  const likedByMe = new Set<string>();
  const repostedByMe = new Set<string>();
  const bookmarkedByMe = new Set<string>();
  const counts: Record<string, number> = {};

  if (postIds.length > 0) {
    const [likesRes, repostsCountRes, bookmarksRes] = await Promise.all([
      userId
        ? supabase.from('likes').select('post_id').in('post_id', postIds).eq('user_id', userId)
        : Promise.resolve({ data: [], error: null }),
      supabase.from('reposts').select('post_id, user_id').in('post_id', postIds).is('quote_content', null),
      userId
        ? supabase.from('bookmarks').select('post_id').in('post_id', postIds).eq('user_id', userId)
        : Promise.resolve({ data: [], error: null }),
    ]);
    for (const row of (likesRes.data ?? []) as { post_id: string }[]) likedByMe.add(row.post_id);
    for (const row of (repostsCountRes.data ?? []) as { post_id: string; user_id: string }[]) {
      counts[row.post_id] = (counts[row.post_id] ?? 0) + 1;
      if (userId && row.user_id === userId) repostedByMe.add(row.post_id);
    }
    for (const row of (bookmarksRes.data ?? []) as { post_id: string }[]) bookmarkedByMe.add(row.post_id);
  }

  const reposterProfiles: Record<string, Profile> = {};
  const { data: reposterData } = await reposterPromise;
  for (const p of (reposterData ?? []) as Profile[]) reposterProfiles[p.id] = p;

  function formatPost(p: Row): Post {
    return {
      id: p.id,
      content: p.content,
      created_at: p.created_at,
      user_id: p.user_id,
      views_count: p.views_count ?? 0,
      image_url: p.image_url ?? null,
      image_urls: p.image_urls ?? [],
      token_mint: p.token_mint ?? null,
      profiles: p.profiles ?? null,
      likes_count: p.likes_count ?? 0,
      comments_count: p.comments_count ?? 0,
      user_has_liked: likedByMe.has(p.id),
    };
  }

  const items: FeedItem[] = [];
  for (const p of basePosts) items.push({ sortKey: p.created_at, kind: 'post', post: formatPost(p) });

  for (const r of repostRows) {
    const original = r.posts;
    if (!original) continue;
    if (r.quote_content) {
      items.push({
        sortKey: r.created_at,
        kind: 'quote',
        repostRowId: r.id,
        post: {
          id: 'quote-' + r.id,
          content: r.quote_content,
          created_at: r.created_at,
          user_id: r.user_id,
          views_count: 0,
          image_url: null,
          profiles: reposterProfiles[r.user_id] ?? null,
          likes_count: 0,
          comments_count: 0,
          user_has_liked: false,
        } as Post,
        quotedPost: formatPost(original),
      });
    } else {
      items.push({
        sortKey: r.created_at,
        kind: 'repost',
        repostedBy: reposterProfiles[r.user_id] ?? null,
        post: formatPost(original),
      });
    }
  }

  items.sort((a, b) => new Date(b.sortKey).getTime() - new Date(a.sortKey).getTime());

  return {
    items,
    nextCursor,
    reposted: Array.from(repostedByMe),
    bookmarked: Array.from(bookmarkedByMe),
    counts,
    userId,
  };
}
