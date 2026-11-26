import { NextRequest, NextResponse } from 'next/server';

const buckets = new Map<string, { n: number; reset: number }>();

// Returns a 429 response when a client IP calls a route too often, otherwise null.
// Calls made inside the server (no client IP header) are not counted.
export function limitRequest(req: NextRequest, name: string, perMinute: number): NextResponse | null {
  const fwd = req.headers.get('x-forwarded-for');
  if (!fwd) return null;
  const key = name + ':' + fwd.split(',')[0].trim();
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    if (buckets.size > 5000) buckets.clear();
    buckets.set(key, { n: 1, reset: now + 60_000 });
    return null;
  }
  b.n += 1;
  if (b.n > perMinute) {
    return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429, headers: { 'Retry-After': '60' } });
  }
  return null;
}
