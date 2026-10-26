'use client';

import { useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { flushQueue } from '@/lib/offlineQueue';

export default function OfflineSync() {
  const { userId } = useAuth();

  useEffect(() => {
    if (!userId) return;
    const supabase = getSupabaseClient();
    const run = () => void flushQueue(supabase, userId);
    run();
    window.addEventListener('online', run);
    const t = setInterval(run, 30_000);
    return () => {
      window.removeEventListener('online', run);
      clearInterval(t);
    };
  }, [userId]);

  return null;
}
