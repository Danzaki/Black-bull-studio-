'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';

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

    void redirect();
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#050505] p-24">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#f97316]/40 bg-[#f97316]/10">
        <span className="text-lg font-black text-[#f97316]">BB</span>
      </div>
      <h1 className="mt-4 text-sm font-bold uppercase tracking-[0.25em] text-stone-500">
        Black Bull Studio
      </h1>
    </main>
  );
}
