export type ChatProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type ConversationPreview = {
  user: ChatProfile;
  lastMessage: string;
  lastMessageAt: string;
  isMine: boolean;
  unreadCount: number;
};

export type ConversationsData = {
  conversations: ConversationPreview[];
  followingIds: string[];
};

export async function fetchConversations(supabase: any, userId: string): Promise<ConversationsData> {
  const [followRes, convRes] = await Promise.all([
    supabase.from('follows').select('following_id').eq('follower_id', userId),
    supabase.rpc('get_conversations', { p_user: userId }),
  ]);

  const followingIds = ((followRes.data ?? []) as { following_id: string }[]).map((r) => r.following_id);
  if (convRes.error) throw new Error(convRes.error.message);

  const rows = (convRes.data ?? []) as {
    other_id: string;
    content: string;
    created_at: string;
    is_mine: boolean;
    unread_count: number | string;
  }[];
  if (rows.length === 0) return { conversations: [], followingIds };

  const { data: profs } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', rows.map((r) => r.other_id));

  const byId: Record<string, ChatProfile> = {};
  for (const p of (profs ?? []) as ChatProfile[]) byId[p.id] = p;

  const conversations = rows
    .filter((r) => byId[r.other_id])
    .map((r) => ({
      user: byId[r.other_id],
      lastMessage: r.content,
      lastMessageAt: r.created_at,
      isMine: r.is_mine,
      unreadCount: Number(r.unread_count) || 0,
    }))
    .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

  return { conversations, followingIds };
}
