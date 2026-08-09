import { getSupabaseClient } from '@/lib/supabaseClient';

export function createClient() {
  return getSupabaseClient();
}