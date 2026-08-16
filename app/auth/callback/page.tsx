'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    async function exchange() {
      const supabase = getSupabaseClient();

      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);

      if (error) {
        router.replace('/auth/sign-in');
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/auth/sign-in');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.onboarding_completed) {
        router.replace('/auth/onboarding');
      } else {
        router.replace('/community');
      }
    }

    void exchange();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050505]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f5b942] border-t-transparent" />
    </main>
  );
}
