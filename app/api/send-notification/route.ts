import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPushNotification } from '@/lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  const { userId, title, body, url } = await request.json();

  if (!userId || !title || !body) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: tokenRows, error } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', userId);

  if (error) {
    console.error('Token fetch error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const tokens = (tokenRows ?? []).map((r: { token: string }) => r.token);

  if (tokens.length === 0) {
    return NextResponse.json({ sent: false, reason: 'No tokens for user' });
  }

  const result = await sendPushNotification(tokens, title, body, url);

  return NextResponse.json({ sent: true, result });
}
