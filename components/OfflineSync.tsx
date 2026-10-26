'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { flushQueue } from '@/lib/offlineQueue';

export default function OfflineSync() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    const supabase = getSupabaseClient();

    const markDelivered = async () => {
      try {
        await supabase
          .from('direct_messages')
          .update({ delivered_at: new Date().toISOString() })
          .eq('receiver_id', userId)
          .is('delivered_at', null);
      } catch {}
    };

    const run = async (refresh: boolean) => {
      await flushQueue(supabase, userId);
      await markDelivered();
      if (refresh) void queryClient.invalidateQueries({ queryKey: ['conversations', userId] });
    };

    void run(false);
    const onOnline = () => void run(true);
    window.addEventListener('online', onOnline);
    const t = setInterval(() => void run(false), 30_000);

    const channel = supabase
      .channel('dm-delivered-' + userId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: 'receiver_id=eq.' + userId },
        (payload: { new: { id: string } }) => {
          void supabase
            .from('direct_messages')
            .update({ delivered_at: new Date().toISOString() })
            .eq('id', payload.new.id);
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('online', onOnline);
      clearInterval(t);
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return null;
}
