import type { Post, Profile } from '@/types/community';

export type FeedTab = 'forYou' | 'following';
export const FEED_PAGE_SIZE = 20;

export type FeedItem =
  | { sortKey: string; kind: 'post'; post: Post }
  | { sortKey: string; kind: 'repost'; post: Post; repostedBy: Profile | null }
  | { sortKey: string; kind: 'quote'; post: Post; quotedPost: Post; repostRowId: string }
  | { sortKey: string; kind: 'promo'; post: Post; promotionId: string };

export type FeedPage = {
  items: FeedItem[];
  nextCursor: string | null;
  reposted: string[];
  bookmarked: string[];
  counts: Record<string, number>;
  userId: string | null;
};
