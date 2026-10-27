import { getSupabaseClient } from '@/lib/supabaseClient';

// Yana ƙirƙirar wallet a bayan fage. Ba ya jefa kuskure, ba ya jinkirta mai amfani.
export async function ensureWallet(): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    await fetch('/api/wallet/create', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
  } catch {}
}
