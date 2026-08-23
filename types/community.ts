export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  verified?: boolean;
  bio?: string | null;
  website?: string | null;
  cover_url?: string | null;
  followers_count?: number;
  following_count?: number;
}

export interface Post {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  views_count?: number;
  image_url?: string | null;
  profiles?: Profile | null;
  likes_count?: number;
  comments_count?: number;
  user_has_liked?: boolean;
}

export interface LikeRow {
  post_id: string;
  user_id: string;
}

export interface CommentRow {
  post_id: string;
}
