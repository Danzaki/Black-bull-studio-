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

      if (user) {
        router.replace('/community');
      } else {
        router.replace('/auth/sign-in');
      }
    }

    void redirect();
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#050505] p-24">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#f5b942]/40 bg-[#f5b942]/10">
        <span className="text-lg font-black text-[#f5b942]">BB</span>
      </div>
      <h1 className="mt-4 text-sm font-bold uppercase tracking-[0.25em] text-white/40">
        Black Bull Studio
      </h1>
    </main>
  );
}
