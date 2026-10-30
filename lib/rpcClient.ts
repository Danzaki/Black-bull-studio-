import { getSupabaseClient } from '@/lib/supabaseClient';

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await getSupabaseClient().auth.getSession();
  return { Authorization: `Bearer ${session?.access_token ?? ''}` };
}

// Yana kiran proxy na server. Yana mayar da Response kamar fetch na al'ada.
export async function rpcFetch(init: RequestInit = {}): Promise<Response> {
  return fetch('/api/rpc', {
    ...init,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    cache: 'no-store',
  });
}

export async function swapsFetch(address: string): Promise<Response> {
  return fetch(`/api/helius/swaps?address=${encodeURIComponent(address)}`, {
    headers: await authHeader(),
    cache: 'no-store',
  });
}
