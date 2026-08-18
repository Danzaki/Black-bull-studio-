export type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  verified: boolean | null;
};

export type Post = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  views_count: number | null;
  profiles: Profile | null;
  likes_count: number;
  comments_count: number;
  user_has_liked: boolean;
  is_repost?: boolean;
};

export type LikeRow = {
  post_id: string;
  user_id: string;
};

export type CommentRow = {
  post_id: string;
};
