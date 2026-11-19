'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';

let confirmedFor: string | null = null;

export default function OnboardingGuard() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname === '/' || pathname.startsWith('/auth') || pathname.startsWith('/offline')) return;
    let alive = true;
    (async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        const uid = session?.user?.id;
        if (!uid || !alive || confirmedFor === uid) return;
        const { data, error } = await supabase.from('profiles').select('onboarding_completed').eq('id', uid).maybeSingle();
        if (error || !alive) return;
        if (data?.onboarding_completed) confirmedFor = uid;
        else router.replace('/auth/onboarding');
      } catch {}
    })();
    return () => { alive = false; };
  }, [pathname, router]);

  return null;
}
