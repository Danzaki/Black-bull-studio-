import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPushNotification } from '@/lib/firebaseAdmin';
import { getUserFromRequest } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

const ALLOWED_TITLES = new Set([
  'You were mentioned',
  'New follower',
  'New comment',
  'New like',
]);

export async function POST(request: NextRequest) {
  const caller = await getUserFromRequest(request);
  if (!caller) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const { userId, title, body, url } = payload ?? {};

  if (typeof userId !== 'string' || typeof title !== 'string' || typeof body !== 'string') {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  if (!ALLOWED_TITLES.has(title)) {
    return NextResponse.json({ error: 'Invalid notification type.' }, { status: 400 });
  }
  if (userId === caller.id) {
    return NextResponse.json({ sent: false, reason: 'Self notification skipped' });
  }

  const safeBody = body.slice(0, 140);
  const safeUrl =
    typeof url === 'string' && url.startsWith('/') && !url.startsWith('//') ? url : undefined;

  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supaUrl || !serviceKey) {
    return NextResponse.json({ error: 'Notification service is not configured.' }, { status: 500 });
  }

  const supabase = createClient(supaUrl, serviceKey);

  const { data: tokenRows, error } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', userId);

  if (error) {
    console.error('Token fetch error:', error.message);
    return NextResponse.json({ error: 'Could not send notification.' }, { status: 500 });
  }

  const tokens = (tokenRows ?? []).map((r: { token: string }) => r.token);

  if (tokens.length === 0) {
    return NextResponse.json({ sent: false, reason: 'No tokens for user' });
  }

  try {
    const result = await sendPushNotification(tokens, title, safeBody, safeUrl);
    return NextResponse.json({ sent: true, result });
  } catch (e) {
    console.error('Push send error:', e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: 'Could not send notification.' }, { status: 502 });
  }
}
