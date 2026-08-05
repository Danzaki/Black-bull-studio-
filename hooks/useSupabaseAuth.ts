'use client';

import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { clearAuthCookies, setAuthCookies } from '@/lib/authCookies';

export function useSupabaseAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseClient();

    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;

      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session) {
        setAuthCookies(data.session);
      }
      setLoading(false);
    }

    loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession) {
        setAuthCookies(currentSession);
      } else {
        clearAuthCookies();
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  return { session, user, loading };
}
