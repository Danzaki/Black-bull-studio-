'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';
import BlackBullLogo from "@/components/icons/BlackBullLogo";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseClient();

    async function redirect() {
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

    void redirect();
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#050505] p-24">
      <BlackBullLogo className="h-14 w-auto text-[#f97316]" />
      <h1 className="mt-4 text-sm font-bold uppercase tracking-[0.25em] text-stone-500">
        Black Bull Studio
      </h1>
    </main>
  );
}
