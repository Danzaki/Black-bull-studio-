'use client';

import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabaseClient';

export function useSupabaseAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const supabase = getSupabaseClient();

      const result = await supabase.auth.getSession();

      if (!mounted) return;

      const currentSession = result.data.session;

      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    }

    loadSession();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    session,
    user,
    loading,
  };
}