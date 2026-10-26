'use client';

import { useQuery } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { fetchConversations } from '@/lib/chat/fetchConversations';

export function useConversations(userId: string | null) {
  return useQuery({
    queryKey: ['conversations', userId],
    enabled: !!userId,
    staleTime: 10_000,
    queryFn: () => fetchConversations(getSupabaseClient(), userId as string),
  });
}
