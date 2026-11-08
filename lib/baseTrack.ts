import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

export const BASE_EVENTS = ['check_token', 'check_wallet', 'radar_open', 'share'] as const;
export type BaseEvent = (typeof BASE_EVENTS)[number];

export async function recordEvent(event: BaseEvent, req: NextRequest, ref?: string | null) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return;
    const ip = (req.headers.get('x-forwarded-for') ?? 'x').split(',')[0].trim();
    const day = new Date().toISOString().slice(0, 10);
    const uid = createHash('sha256').update(key + ':' + day + ':' + ip).digest('hex').slice(0, 16);
    const admin = createClient(url, key, { auth: { persistSession: false } });
    await admin.from('base_events').insert({ event, ref: ref ?? null, uid });
  } catch {}
}
