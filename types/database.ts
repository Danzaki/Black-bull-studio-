export interface Post {
  id: string;
  user_id?: string | null;
  author_name: string;
  username: string;
  content: string;
  image_url?: string | null;
  media_type?: 'image' | 'video' | null;
  quoted_post_id?: string | null;
  created_at: string;
  updated_at?: string;
  
  // Computed / Joined properties
  likes_count?: number;
  comments_count?: number;
  reposts_count?: number;
  has_liked?: boolean;
  has_reposted?: boolean;
  quoted_post?: Post | null;
}

export interface Comment {
  id: string;
  post_id: string;
  parent_comment_id?: string | null;
  user_id?: string | null;
  author_name: string;
  username: string;
  text: string;
  created_at: string;
  
  // Computed properties
  likes_count?: number;
  has_liked?: boolean;
}
