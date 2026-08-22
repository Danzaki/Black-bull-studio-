'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';

interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
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
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      setUserId(user.id);
      const { data } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      if (data) setProfile(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event: string, session: { user?: { id: string } } | null) => {
      if (session?.user) {
        setUserId(session.user.id);
      } else {
        setUserId(null);
        setProfile(null);
      }
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
