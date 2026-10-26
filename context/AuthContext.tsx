'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { get, set, del } from 'idb-keyval';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { requestNotificationPermission } from '@/lib/firebaseClient';
import { invalidateFeedCache } from '@/lib/feedCache';

const PERSIST_KEY = 'REACT_QUERY_OFFLINE_CACHE';
const OWNER_KEY = 'bbl-cache-owner';

interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  verified?: boolean | null;
}

interface AuthContextValue {
  userId: string | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  userId: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function wipeCache() {
    invalidateFeedCache();
    queryClient.clear();
    try {
      await del(PERSIST_KEY);
      await del(OWNER_KEY);
    } catch (e) {
      console.error('Cache wipe failed:', e);
    }
  }

  async function claimCache(uid: string) {
    try {
      const owner = await get(OWNER_KEY);
      if (owner && owner !== uid) {
        invalidateFeedCache();
        queryClient.clear();
        await del(PERSIST_KEY);
      }
      await set(OWNER_KEY, uid);
    } catch (e) {
      console.error('Cache owner check failed:', e);
    }
  }

  async function loadUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error && /jwt/i.test(error.message)) {
      console.error('Session token error, signing out:', error.message);
      await supabase.auth.signOut();
      await wipeCache();
      setUserId(null);
      setProfile(null);
      setLoading(false);
      if (typeof window !== 'undefined') {
        window.alert('Your session expired or your device clock is out of sync. Please check your date/time settings and sign in again.');
        window.location.href = '/auth/sign-in';
      }
      return;
    }

    if (user) {
      await claimCache(user.id);
      setUserId(user.id);
      const { data } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, verified')
        .eq('id', user.id)
        .maybeSingle();

      if (data) setProfile(data);

      try {
        const token = await requestNotificationPermission();
        if (token) {
          await supabase.from('push_tokens').upsert(
            { user_id: user.id, token },
            { onConflict: 'token' }
          );
        }
      } catch (pushErr) {
        console.error('Push token registration failed:', pushErr);
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event: string, session: { user?: { id: string } } | null) => {
      if (session?.user) {
        setUserId(session.user.id);
      } else {
        setUserId(null);
        setProfile(null);
      }
      if (event === 'SIGNED_OUT') void wipeCache();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ userId, profile, loading, refreshProfile: loadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
