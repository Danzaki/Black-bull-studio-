import { NextRequest, NextResponse } from 'next/server';
import { recordEvent, type BaseEvent } from '@/lib/baseTrack';

export const dynamic = 'force-dynamic';

const EVM_RE = /^0x[a-fA-F0-9]{40}$/;
const ALLOWED = ['check_token', 'share'];
const hits = new Map<string, { n: number; reset: number }>();

function limited(ip: string) {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now > h.reset) {
    hits.set(ip, { n: 1, reset: now + 60_000 });
    return false;
  }
  h.n += 1;
  if (hits.size > 2000) hits.clear();
  return h.n > 60;
}

export async function POST(req: NextRequest) {
  const ip = (req.headers.get('x-forwarded-for') ?? 'x').split(',')[0].trim();
  if (limited(ip)) return NextResponse.json({ ok: false }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const ev = String(body?.event ?? '');
  if (!ALLOWED.includes(ev)) return NextResponse.json({ ok: false }, { status: 400 });
  const ref = typeof body?.ref === 'string' && EVM_RE.test(body.ref) ? body.ref.toLowerCase() : null;
  await recordEvent(ev as BaseEvent, req, ref);
  return NextResponse.json({ ok: true });
}
