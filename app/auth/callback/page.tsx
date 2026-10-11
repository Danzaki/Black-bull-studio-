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

      let profile: { onboarding_completed?: boolean | null } | null = null;
      let profileError: unknown = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const res = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .maybeSingle();
        profile = res.data;
        profileError = res.error;
        if (!profileError) break;
        await new Promise((r) => setTimeout(r, 1000));
      }
      if (profileError) {
        router.replace('/community');
        return;
      }

      if (!profile?.onboarding_completed) {
        router.replace('/auth/onboarding');
      } else {
        router.replace('/community');
      }
    }

    void exchange();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f5f2]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f97316] border-t-transparent" />
    </main>
  );
}
